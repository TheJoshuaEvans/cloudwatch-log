'use strict';

const CloudWatchLogOpts = require('../classes/cloudwatch-log-opts.js');
const LogEvent = require('../classes/log-event.js');

const createLogStream = require('../units/create-log-stream.js');
const putLogEvent = require('../units/put-log-events.js');

const defer = require('../utils/defer.js');
const processLogEvents = require('../utils/process-log-events.js');

class CloudWatchLog {
  /**
   * Helper class that is used to build individual log events. This class does not have to be
   * used to put events into CloudWatch, but gives greater control if desired. Use of this
   * class is required to apply custom timestamps to individual items
   */
  static get LogEvent() {
    return LogEvent;
  }

  /**
   * Helper class identifies the options available for CloudWatchLog instantiation
   */
  static get CloudWatchLogOpts() {
    return CloudWatchLogOpts;
  }

  /**
   * Create a new CloudWatchLog object. Requires a CloudWatchLogsSDk instance for sending
   * logs to CloudWatch
   * 
   * @param {object} cloudWatchLogsSdk Previously instantiated CloudWatchLogs SDK
   * @param {CloudWatchLogOpts|string} opts Configuration options. A simple string can be
   *   provided to only define the log group name
   */
  constructor(cloudWatchLogsSdk, opts) {
    if (typeof opts === 'string') opts = {logGroupName: opts};
    this.cloudWatchLogsSdk = cloudWatchLogsSdk;
    this.opts = new CloudWatchLogOpts(opts);

    this._streamInitiated = opts.logStreamName && opts.nextSequenceToken;
    this._promiseArr = [];
    this._nextEvents = [];
    this._isTimeout = false;
    this._lastCallTime = 0;
  }
  
  /**
   * Put new log events into CloudWatch. This method will not throw an error and can be 
   * lazily run. If an unexpected error occurs, the returned object will contain an `error`
   * member with details
   * 
   * This method will also perform smart buffering of putLogEvent requests. If there has not
   * been a `put` call made in the last 200ms the request will be sent immediately. Otherwise
   * the request will be buffered, combined with any other requests that were also made in the
   * interval and sent 200ms after the previous request as a single batch
   *
   * @param {string|object[]} logEvents Items to be added to CloudWatch. Can be a single item
   *   or an array. If any provided items are not strings they will be converted into strings.
   *   Any `LogEvent` instances provided will be copied and put to CloudWatch as-is 
   * 
   * @return {object} Object with information about the put operation
   */
  async put(logEvents) {
    const promise = defer();
    this._promiseArr.push(promise);

    logEvents = processLogEvents(logEvents);
    this._nextEvents = [...this._nextEvents, ...logEvents];
    
    if (!this._streamInitiated) await this.start();

    if (this._isTimeout) return promise;
    const now = Date.now();
    setTimeout(async () => {
      const opts = {
        cloudWatchLogsSdk: this.cloudWatchLogsSdk,
        logGroupName: this.opts.logGroupName,
        logStreamName: this.opts.logStreamName,
        logEvents: this._nextEvents,
        sequenceToken: this.opts.nextSequenceToken
      };

      const currentPromises = this._promiseArr;
      this._promiseArr = [];
      this._isTimeout = false;
      this._lastCallTime = Date.now();
      this._nextEvents = [];
      let result;
      try {
        result = await putLogEvent(opts);
      } catch(e) {
        // Do not throw errors
        result = {
          logStreamName: null,
          nextSequenceToken: null
        };
        opts.error = e;
      }

      opts.logStreamName = result.logStreamName;
      opts.nextSequenceToken = this.opts.nextSequenceToken = result.nextSequenceToken;

      currentPromises.forEach((promiseVal) => {
        promiseVal.resolve(opts);
      });
    }, this._lastCallTime + 200 - now);
    this._isTimeout = true;

    return promise;
  }

  /**
   * Create a new log stream to send events to. If an unexpected error occurs, the returned
   * object will contain an `error` member with details. This method should generally be
   * reserved for internal use
   * 
   * @return {object} Object with information about the log stream
   */
  async start() {
    const sdk = this.cloudWatchLogsSdk;
    const opts = {
      cloudWatchLogsSdk: sdk,
      logGroupName: this.opts.logGroupName,
      logStreamName: this.opts.logStreamName
    };
    let result;
    try {
      result = await createLogStream(opts);
    } catch(e) {
      // Do not throw errors
      return {error: e};
    }
    this._streamInitiated = true;

    this.opts.logStreamName = result.logStreamName;
    this.opts.nextSequenceToken = null;

    return {
      logGroupName: this.opts.logGroupName,
      logStreamName: result.logStreamName
    };
  }
}

module.exports = CloudWatchLog;
