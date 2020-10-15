'use strict';

/**
 * Takes log data and returns a processed array of log event items ready for upload to
 * CloudWatch. Accepts either a single string, and array of strings, or an array of objects
 * 
 * @param {string|string[]|object[]} logs The log data to be processed
 * @param {number} [timestamp] Timestamp to use for log events. Default is the current moment
 */
const processLogEvents = (logs, timestamp = Date.now()) => {
  if (!Array.isArray(logs)) {
    // We were given a single object
    let message = logs;
    if (typeof message !== 'string') message = JSON.stringify(logs);

    return [{message, timestamp}];
  }

  return logs.map((log) => {
    if (typeof log !== 'object') return {message: log.toString(), timestamp};
    if (typeof log.message === 'undefined') return {message: JSON.stringify(log), timestamp};
    if (typeof log.timestamp === 'undefined') return {message: log.message, timestamp};
    return {message: log.message, timestamp: log.timestamp};
  });
};

module.exports = processLogEvents;
