'use strict';

const util = require('util');

const config = require('../../config.js');
const { isTest } = require('../../utils.js');

const removeCharacter = require('../utils/remove-character.js');

/**
 * Creates a new log stream with the given name, within the given log group
 * 
 * @param {object} opts Object with the following members
 * - `{object}` cloudWatchLogSdk Previously instantiated CloudWatchLog SDK object
 * - `{string}` groupName Log Group to add the stream to
 * - `{string}` [streamName] Name to give the log stream. Default to current time
 * 
 * @return {object} Response object from cloudWatch, or null in case of an error
 */
const createLogStream = async (opts = {}) => {
  let res = null;
  const cloudWatchLogSdk = opts.cloudWatchLogSdk || opts.cloudWatchLogsSdk;
  const groupName = opts.groupName || opts.logGroupName;
  let streamName = opts.streamName || opts.logStreamName || (new Date()).toISOString();

  if (!cloudWatchLogSdk || !groupName) {
    console.error('createLogStream parameter error: unexpected falsy value');
    if (!isTest()) console.error(opts);
    return res;
  }

  // Remove any restricted characters from the name string (replacing it with "-")
  config.cloudWatchLog.logStreamRestrictedCharacters.forEach((restrictedChar) => {
    streamName = removeCharacter(streamName, restrictedChar);
  });

  const awsCreateLogStream = util.promisify(cloudWatchLogSdk.createLogStream).bind(cloudWatchLogSdk);
  const params = {
    logGroupName: groupName,
    logStreamName: streamName
  };

  try {
    res = await awsCreateLogStream(params);
  } catch(e) {
    console.error('createLogStream aws error: could not create log stream');
    console.error(e);
  }

  res.logStreamName = streamName;

  return res;
};

module.exports = createLogStream;
