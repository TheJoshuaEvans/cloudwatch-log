'use strict';

/**
 * Class defined options for the CloudWatchLog class
 */
class CloudWatchLogOpts {
  constructor(opts) {
    /**
     * Name of the CloudWatch log group to use. REQUIRED
     * 
     * @type {string}
     */
    this.logGroupName = opts.logGroupName;

    /**
     * Name of the CloudWatch log stream to use. Optional, defaults to an ISO string of the
     * current moment
     * 
     * @type {string}
     */
    this.logStreamName = opts.logStreamName || (new Date()).toISOString();

    /**
     * The sequence token used to add items to an already established log stream. Optional,
     * this value is only needed when using an existing log stream
     * 
     * @type {string}
     */
    this.nextSequenceToken = opts.nextSequenceToken || null;
  }
}

module.exports = CloudWatchLogOpts;
