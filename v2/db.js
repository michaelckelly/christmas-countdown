var envvar = require('envvar');
var mongoose = require('mongoose');

var DB_URL = envvar.string('DB_URL');

var schema = new mongoose.Schema({
  name: String,
  number: {type: String, index: true},
  timezone: {type: String, index: true},
  status: String,
  lastMessageSent: Date,
  master: {type: Boolean, default: false},
  customResponse: String,
  oneTimeResponse: {type: Boolean, default: false},
});

var Subscriber = mongoose.model('Subscriber', schema);

mongoose.connect(DB_URL, function() {
  console.log('db connection opened');
});

module.exports = Subscriber;
