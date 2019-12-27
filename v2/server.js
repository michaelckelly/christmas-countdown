var async = require('async');
var cron = require('cron').CronJob;
var envvar = require('envvar');
var moment = require('moment');
var nodemailer = require('nodemailer');
var R = require('ramda');
var time = require('time');

var db = require('./db');

// Sensitive information is passed in as env vars
var TWILIO_SID = envvar.string('TWILIO_SID');
var TWILIO_TOKEN = envvar.string('TWILIO_TOKEN');
var TWILIO_NUMBER = envvar.string('TWILIO_NUMBER');

var GMAIL_USERNAME = envvar.string('GMAIL_USERNAME');
var GMAIL_PASSWORD = envvar.string('GMAIL_PASSWORD');

var NODE_ENV = envvar.string('NODE_ENV');

var WEST_COAST_CRON = envvar.string('WEST_COAST_CRON');
var EAST_COAST_CRON = envvar.string('EAST_COAST_CRON');

var twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
var transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: GMAIL_USERNAME,
    pass: GMAIL_PASSWORD
  }
});

var mailOptions = {
  from: 'Christmas Bot <'+ GMAIL_USERNAME +'>',
  to: GMAIL_USERNAME,
  subject: 'Christmas Error Log for '+ moment().format('MMMM D, YYYY')
}

var sendTexts = function(timezone) {
  var numbers = db.find({status: 'subscribed', timezone: timezone}, function(err, subscribers) {
    if(err != null) {
      transport.sendMail(R.mixin(mailOptions, {text: JSON.stringify(err)}));
    } else {
      // Record failures
      var failed = [];

      var send = function(obj, cbk) {
        twilio.messages.create({
          'to': obj.number,
          'from': TWILIO_NUMBER,
          //'body': 'Only ' + daysUntil() + ' more days until Christmas!',
	  'body': 'Wishing you a merry merry Christmas!\n- SC',
        }, function(err, res) {
          if (err != null) {
            failed = R.append(R.mixin(obj, err), failed);
          }
          obj.lastMessageSent = new Date;
          obj.save();
          cbk();
        });
      }

      async.each(subscribers, send, function(err) {
        if (R.size(failed) > 0) {
          transport.sendMail(R.mixin(mailOptions, {text: JSON.stringify(failed)}));
        } else {
          twilio.messages.create({
            'to': '+13017044677',
            'from': TWILIO_NUMBER,
            'body': R.size(subscribers) +' messages sent successfuly for '+ timezone +' timezone on '+ moment().format('MM-DD-YYYY')
          });
        }
      });
    }
  });
}

var east = new cron({
  cronTime: EAST_COAST_CRON,
  onTick: R.lPartial(sendTexts, 'east'),
  start: true,
  timezone: 'America/New_York'
});

var west = new cron({
  cronTime: WEST_COAST_CRON,
  onTick: R.lPartial(sendTexts, 'west'),
  start: true,
  timezone: 'America/New_York'
});

var express = require('express');
var app = express();
app.use(require('body-parser').urlencoded({extended: false}));

var server = app.listen(NODE_ENV === 'development' ? 3000 : envvar.number('APP_PORT', 80));

app.post('/sms', function(req, res) {
  res.set('Content-Type', 'text/plain');
  res.status(200);

  var from = R.prop('From', req.body);
  if(!from) {
    return res.send('Hmm...');
  }

  db.findOne({number: from}, function(err, doc) {
    if (err != null || !doc) {
        res.send('Well hello there! This is Santa Claus (duh!) -- ' +
                 'just reply to this message to get a daily Christmas ' +
                 'countdown text.\n- SC');
        var sub = new db;
        sub.number = from;
        sub.timezone = 'east';
        sub.status = 'pending';
        sub.lastMessageSent = new Date;
        sub.save();
    } else {
      if (R.propEq('status', 'pending')(doc)) {
        res.send('You\'re all set!  Best part -- only '+ daysUntil() +' more days until Christmas!\n- S.C.');
        doc.status = 'subscribed';
        doc.lastMessageSent = new Date;
        doc.save();
      } else {
        if (doc.customResponse && doc.customResponse !== '') {
          res.send(doc.customResponse);
          if (doc.oneTimeResponse) {
            doc.customResponse = '';
          }
        } else {
          res.send('Someone is antsy for Christmas... but don\'t bother me about it!  I\'m pretty busy this time of of year...');
        }
        doc.lastMessageSent = new Date;
        doc.save();
      }
    }
  });
});

app.post('/status', function(req, res) {
  res.set('Content-Type', 'text/plain');
  res.status(200);
  res.send('# days: '+ daysUntil());
});

var daysUntil = function(until) {
  if(!until) {
    until = '2015-12-25';
  }
  return moment(until).diff(moment(), 'days') + 1;
}


