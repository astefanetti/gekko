var _ = require('lodash');
var plivo = require('plivo');
var log = require('../core/log.js');
var util = require('../core/util.js');
var config = util.getConfig();
var smsConfig = config.smsPlivo;

var SMSPlivo = function(done) {
  _.bindAll(this);

  this.price = 'N/A';
  this.client;
  this.done = done;
  this.setup();
}

SMSPlivo.prototype.setup = function(done) {
    var errors = [];
    if(_.isEmpty(smsConfig.to))
      errors.push("No destination number configured for SMS Plivo Config");
    if(_.isEmpty(smsConfig.from))
      errors.push("No sending number configured for SMS Plivo Config");
    if(_.isEmpty(smsConfig.authId))
      errors.push("No AuthId configured for SMS Plivo Config");
    if(_.isEmpty(smsConfig.authToken))
      errors.push("No AuthToken configured for SMS Plivo Config");

    // init the client...
    var api = plivo.RestAPI({
      authId: smsConfig.authId,
      authToken: smsConfig.authToken,
    });
    this.client = api;

    debugger;
    if(smsConfig.sendMailOnStart && errors.length === 0) {
      var messageText = [
          "Watching: ",
          config.watch.exchange,
          ' ',
          config.watch.currency,
          '/',
          config.watch.asset,
          ". Advice soon."
        ].join('');

      this.mail(
        messageText,
        _.bind(function(err) {
          this.checkResults(err);
          this.done();
        }, this)
      );

    } else if(errors.length !== 0){
      throw new Error(errors);
    } else {
      this.done();
    }
    
  log.debug('Setup SMS adviser.');
}

SMSPlivo.prototype.mail = function(content, done) {
  var self = this;

  function buildMessage(){
    var message = smsConfig.smsPrefix + ' ' + content;
    var params = {
        'src': smsConfig.from, // Caller Id
        'dst' : smsConfig.to, // User Number to Call
        'text' : message,
        'type' : "sms",
    };
    return params;
  }

  self.client.send_message(buildMessage(), function(status, response) {
      log.debug('SMS Plivo Sending Status: ', status);
      log.debug('SMS Plivo API Response: ', response);
      var error = null;
      if(status != 202 && status != 200){
        error = response;
        self.checkResults(error);
      } else {
        done();
      }
  });
}

SMSPlivo.prototype.processTrade = function(trade) {
  this.price = trade.price;
}

SMSPlivo.prototype.processAdvice = function(advice) {
  var text = [
    'Watching ',
    config.watch.exchange,
    '. New trend, go ',
    advice.recommandation,
    '.\n\nCurrent ',
    config.watch.asset,
    ' price is ',
    this.price
  ].join('');
  this.mail(text);
}

SMSPlivo.prototype.checkResults = function(err) {
  if(err)
    log.warn('error sending SMS', err);
  else
    log.info('Send advice via SMS.');
}

module.exports = SMSPlivo;
