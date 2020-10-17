'use strict';

const LogEvent = require('../classes/log-event.js');

/**
 * Takes log data and returns a processed array of log event items ready for upload to
 * CloudWatch. Accepts either a single string, and array of strings, or an array of objects
 * 
 * @param {string|string[]|object[]} logs The log data to be processed
 * @param {number} [timestamp] Timestamp to use for log events. Default is the current moment
 */
const processLogEvents = (logs, timestamp = Date.now()) => {
  if (!Array.isArray(logs)) logs = [logs];

  return logs.map((log) => {
    if (typeof log !== 'object') return new LogEvent(log.toString(), timestamp);
    if (log instanceof LogEvent) return LogEvent.copy(log);
    return new LogEvent(JSON.stringify(log), timestamp);
  });
};

module.exports = processLogEvents;
