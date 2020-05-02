'use strict';

const config = require('../../config.js');

const createLogStream = require('../units/create-log-stream.js');
const putLogEvent = require('../units/put-log-events.js');

class CloudWatchLog {
  /**
   * Create a new CloudWatchLog object. Requires a CloudWatchLogsSDk instance for sending
   * logs to CloudWatch, as well as the name of the group to send logs to
   * 
   * @param {object} cloudWatchLogsSdk Previously instantiated CloudWatchLogs SDK
   * @param {string} logGroupName Name of the Log Group to send logs to
   * @param {object} conf Optional. Configuration options to use - overwrites defaults
   */
  constructor(cloudWatchLogsSdk, logGroupName, conf = null) {
    if (conf) config.loadConfig(config);
    this.cloudWatchLogsSdk = cloudWatchLogsSdk;
    this.logGroupName = logGroupName;

    this.nextSequenceToken = null;
    this.logStreamName = null;
  }
  
  /**
   * Put a new log event in to CloudWatch
   *
   * @param {string|object[]} logEvents Either a single string, or an array of logEvent objects
   * @param {object} [streamInfo] Information required to put log events in an existing Log Stream
   * - {string} streamName - The name of the log stream
   * - {string} sequenceToken - The "nextSequenceToken" value from the previous put
   * 
   * @return {object} Object with information about the put operation
   */
  async put(logEvents, streamInfo = {}) {
    // Normalize in case a single value was given
    if (!Array.isArray(logEvents)) {
      logEvents = [
        {
          message: logEvents,
          timestamp: Date.now()
        }
      ];
    }

    if (streamInfo.streamName) this.logStreamName = streamInfo.streamName;
    if (streamInfo.nextSequenceToken) this.nextSequenceToken = streamInfo.sequenceToken;
    if (!this.logStreamName) await this.start();

    const cloudWatchLogsSdk = this.cloudWatchLogsSdk;
    const logGroupName = this.logGroupName;
    const logStreamName = this.logStreamName;
    const sequenceToken = this.nextSequenceToken;
    const opts = {
      cloudWatchLogsSdk,
      logGroupName,
      logStreamName,
      logEvents,
      sequenceToken
    };

    const result = await putLogEvent(opts);

    opts.nextSequenceToken = this.nextSequenceToken = result.nextSequenceToken;

    return opts;
  }

  /**
   * Create a new log stream to send events to
   * 
   * @param {string} [logStreamName] Desired log stream name. Default is the current time
   * 
   * @return {object} Object with information about the log stream
   */
  async start(logStreamName = null) {
    const sdk = this.cloudWatchLogsSdk;
    const groupName = this.logGroupName;
    const opts = {
      cloudWatchLogsSdk: sdk,
      logGroupName: groupName
    };
    if (logStreamName) opts.logStreamName = logStreamName;
    const result = await createLogStream(opts);

    this.logStreamName = result.logStreamName;
    this.nextSequenceToken = null;

    return {
      logGroupName: groupName,
      logStreamName: result.logStreamName
    };
  }
}

module.exports = CloudWatchLog;
