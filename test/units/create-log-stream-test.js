'use strict';

const assert = require('assert');
const util = require('util');

const CloudWatchLogSDK = require('aws-sdk/clients/cloudwatchlogs');

const config = require('../../config.js');
const itSlowly = require('../test-utils/it-slowly.js');

const createLogStream = require('../../lib/units/create-log-stream.js');

const cloudWatchOpts = {
  region: 'us-west-2',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
};
const cloudWatchLogSdk = new CloudWatchLogSDK(cloudWatchOpts);
const describeLogStreams = util.promisify(cloudWatchLogSdk.describeLogStreams).bind(cloudWatchLogSdk);

const groupName = '/logs/test';

describe('create-log-stream', function() {
  this.timeout(10000);
  it('should return null when missing parameters', async () => {
    let res = await createLogStream({cloudWatchLogSdk});
    assert.strictEqual(res, null);

    res = await createLogStream();
    assert.strictEqual(res, null);
  });

  itSlowly('should create a new log stream with a default name', async () => {
    const res = await createLogStream({cloudWatchLogSdk, groupName});
    assert.strictEqual(typeof res, 'object');
    assert.strictEqual(typeof res.logStreamName, 'string');

    const foundLongStream = await describeLogStreams({logGroupName: groupName, logStreamNamePrefix: res.logStreamName});
    assert.strictEqual(typeof foundLongStream, 'object');
    assert.strictEqual(Array.isArray(foundLongStream.logStreams), true);
    assert.strictEqual(foundLongStream.logStreams.length, 1);
    assert.strictEqual(foundLongStream.logStreams[0].logStreamName, res.logStreamName);
  });

  const customName = `${Date.now()}-custom-name-test`;
  itSlowly('should create a new log stream with an explicit name', async () => {
    const res = await createLogStream({cloudWatchLogSdk, groupName, streamName: customName});
    assert.strictEqual(typeof res, 'object');
    assert.strictEqual(res.logStreamName, customName);

    const foundLongStream = await describeLogStreams({logGroupName: groupName, logStreamNamePrefix: customName});
    assert.strictEqual(typeof foundLongStream, 'object');
    assert.strictEqual(Array.isArray(foundLongStream.logStreams), true);
    assert.strictEqual(foundLongStream.logStreams.length, 1);
    assert.strictEqual(foundLongStream.logStreams[0].logStreamName, customName);
  });

  itSlowly('should not error when creating a log stream that already exists', async () => {
    const res = await createLogStream({cloudWatchLogSdk, groupName, streamName: customName});
    assert.strictEqual(typeof res, 'object');
    assert.strictEqual(res.logStreamName, customName);
  });
});
