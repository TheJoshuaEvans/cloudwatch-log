'use strict';

const util = require('util');

const config = require('../../config.js');
const { isTest } = require('../../utils.js');

const removeCharacter = require('../utils/remove-character.js');

/**
 * Puts log events into a CloudWatch Log Stream
 * 
 * @param {object} opts Object with the following members
 * - `{object}` cloudWatchLogSdk - Previously instantiated CloudWatchLog SDK
 * - `{string}` groupName - Name of the CloudWatch Log Group
 * - `{string}` streamName - Name of the CloudWatch Log Stream
 * - `{object[]}` logEvents - Array of log event objects to add to the log stream
 * - `{string}` sequenceToken - Token from the previous put log event. Not needed for a new stream
 * 
 * @return {object} Result from the operation or null if there was an error
 */
const putLogEvents = async (opts = {}, conf = config) => {
  let res = null;
  const cloudWatchLogSdk = opts.cloudWatchLogSdk || opts.cloudWatchLogsSdk;
  const groupName = opts.groupName || opts.logGroupName;
  let streamName = opts.streamName || opts.logStreamName;
  const logEvents = opts.logEvents;
  const sequenceToken = opts.sequenceToken || null;
  if (!cloudWatchLogSdk || !groupName || !streamName || !logEvents) {
    console.error('putLogEvents parameter error: unexpected falsy value');
    if (!isTest()) console.error(opts);
    return res;
  }

  // Remove any restricted characters from the name string (replacing it with "-")
  conf.cloudWatchLog.logStreamRestrictedCharacters.forEach((restrictedChar) => {
    streamName = removeCharacter(streamName, restrictedChar);
  });

  const awsPutLogEvent = util.promisify(cloudWatchLogSdk.putLogEvents).bind(cloudWatchLogSdk);
  const params = {
    logEvents,
    logGroupName: groupName,
    logStreamName: streamName
  };
  if (sequenceToken) params.sequenceToken = sequenceToken;

  try {
    res = await awsPutLogEvent(params);
  } catch(e) {
    // Check for an invalid sequence token - this error is recoverable
    if (e.code !== 'InvalidSequenceTokenException') throw e;

    // The next expected sequence token is the last word of the error message. This is a
    // somewhat brittle solution and will break if AWS changes the message format
    params.sequenceToken = e.message.split(' ').pop();
    res = await awsPutLogEvent(params);
  }
  res.logStreamName = streamName;

  return res;
};

module.exports = putLogEvents;
