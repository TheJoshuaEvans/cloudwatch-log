'use strict';

const assert = require('assert');
const util = require('util');

const CloudWatchLogSDK = require('aws-sdk/clients/cloudwatchlogs');

const config = require('../../config.js');
const itSlowly = require('../test-utils/it-slowly.js');
const wait = require('../test-utils/wait.js');

const createLogStream = require('../../lib/units/create-log-stream.js');
const putLogEvents = require('../../lib/units/put-log-events.js');

const removeCharacter = require('../../lib/utils/remove-character.js');

const cloudWatchOpts = {
  region: 'us-west-2',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
};
const cloudWatchLogSdk = new CloudWatchLogSDK(cloudWatchOpts);
const getLogEvents = util.promisify(cloudWatchLogSdk.getLogEvents).bind(cloudWatchLogSdk);

const groupName = '/logs/test';

describe('put-log-event', function() {
  this.timeout(100000);
  it('should return null when missing parameters', async () => {
    let res = await putLogEvents({cloudWatchLogSdk, groupName: 'group-name', streamName: 'stream-name'});
    assert.strictEqual(res, null);

    res = await putLogEvents({cloudWatchLogSdk, groupName: 'group-name'});
    assert.strictEqual(res, null);

    res = await putLogEvents({cloudWatchLogSdk});
    assert.strictEqual(res, null);

    res = await putLogEvents({});
    assert.strictEqual(res, null);

    res = await putLogEvents();
    assert.strictEqual(res, null);
  });

  itSlowly('should add event to new log stream', async () => {
    const streamName = `${(new Date()).toISOString()}-put-log`;
    const { logStreamName } = await createLogStream({cloudWatchLogSdk, groupName, streamName});
    assert.strictEqual(logStreamName, removeCharacter(streamName, ':', '-'));

    const logEvents = [
      {
        message: `This is a test message for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    const putLogEventRes = await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');

    await wait(2000);
    const existingLogEvents = await getLogEvents({logGroupName: groupName, logStreamName});

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);
    
    const foundMatch = existingLogEvents.events.find((event) => event.message === logEvents[0].message);
    assert.strictEqual(foundMatch.message, logEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, logEvents[0].timestamp);
  });

  itSlowly('should add multiple events to the same stream in sequence', async () => {
    const streamName = `${(new Date()).toISOString()}-put-log-multiple-sequential`;
    const { logStreamName } = await createLogStream({cloudWatchLogSdk, groupName, streamName});
    assert.strictEqual(logStreamName, removeCharacter(streamName, ':', '-'));

    const firstLogEvents = [
      {
        message: `This is test message 1 for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    let putLogEventRes = await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents: firstLogEvents});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');
    assert.strictEqual(putLogEventRes.logStreamName, removeCharacter(streamName, ':', '-'));
    const sequenceToken = putLogEventRes.nextSequenceToken;

    const secondLogEvents = [
      {
        message: `This is test message 2 for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    putLogEventRes = await await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents: secondLogEvents, sequenceToken});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');
    assert.strictEqual(putLogEventRes.logStreamName, removeCharacter(streamName, ':', '-'));

    await wait(2000);
    const existingLogEvents = await getLogEvents({logGroupName: groupName, logStreamName});
    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);
    
    let foundMatch = existingLogEvents.events.find((event) => event.message === firstLogEvents[0].message);
    assert.strictEqual(foundMatch.message, firstLogEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, firstLogEvents[0].timestamp);
    
    foundMatch = existingLogEvents.events.find((event) => event.message === secondLogEvents[0].message);
    assert.strictEqual(foundMatch.message, secondLogEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, secondLogEvents[0].timestamp);
  });

  itSlowly('should add multiple events to the same stream at once', async () => {
    const streamName = `${(new Date()).toISOString()}-put-log-multiple-simultaneous`;
    const { logStreamName } = await createLogStream({cloudWatchLogSdk, groupName, streamName});
    assert.strictEqual(logStreamName, removeCharacter(streamName, ':', '-'));

    const logEvents = [
      {
        message: `This is test message 1 for stream name: ${streamName}`,
        timestamp: Date.now()
      },
      {
        message: `This is test message 2 for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    const putLogEventRes = await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');
    assert.strictEqual(putLogEventRes.logStreamName, removeCharacter(streamName, ':', '-'));

    await wait(2000);
    const existingLogEvents = await getLogEvents({logGroupName: groupName, logStreamName});
    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);
    
    let foundMatch = existingLogEvents.events.find((event) => event.message === logEvents[0].message);
    assert.strictEqual(foundMatch.message, logEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, logEvents[0].timestamp);
    
    foundMatch = existingLogEvents.events.find((event) => event.message === logEvents[1].message);
    assert.strictEqual(foundMatch.message, logEvents[1].message);
    assert.strictEqual(foundMatch.timestamp, logEvents[1].timestamp);
  });

  itSlowly('should recover from an invalid sequence token failure', async () => {
    const streamName = `${(new Date()).toISOString()}-recover-invalid-token`;
    const { logStreamName } = await createLogStream({cloudWatchLogSdk, groupName, streamName});
    assert.strictEqual(logStreamName, removeCharacter(streamName, ':', '-'));

    const firstLogEvents = [
      {
        message: `This is test message 1 for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    let putLogEventRes = await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents: firstLogEvents});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');
    assert.strictEqual(putLogEventRes.logStreamName, removeCharacter(streamName, ':', '-'));

    const secondLogEvents = [
      {
        message: `This is test message 2 for stream name: ${streamName}`,
        timestamp: Date.now()
      }
    ];
    putLogEventRes = await await putLogEvents({cloudWatchLogSdk, groupName, streamName: logStreamName, logEvents: secondLogEvents, sequenceToken: 'badToken'});
    assert.strictEqual(typeof putLogEventRes.nextSequenceToken, 'string');
    assert.strictEqual(putLogEventRes.logStreamName, removeCharacter(streamName, ':', '-'));

    await wait(2000);
    const existingLogEvents = await getLogEvents({logGroupName: groupName, logStreamName});
    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);
    
    let foundMatch = existingLogEvents.events.find((event) => event.message === firstLogEvents[0].message);
    assert.strictEqual(foundMatch.message, firstLogEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, firstLogEvents[0].timestamp);
    
    foundMatch = existingLogEvents.events.find((event) => event.message === secondLogEvents[0].message);
    assert.strictEqual(foundMatch.message, secondLogEvents[0].message);
    assert.strictEqual(foundMatch.timestamp, secondLogEvents[0].timestamp);
  });
});
