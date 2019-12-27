var moment = require('moment');


var daysUntil = function(until) {
  if(!until) {
    until = '2014-12-25';
  }
  return moment(until).diff(moment(), 'days') + 1;
}

console.log(daysUntil());
