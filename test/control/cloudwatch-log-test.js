'use strict';

const assert = require('assert');
const util = require('util');
const config = require('../../config.js');

const itSlowly = require('../test-utils/it-slowly.js');
const wait = require('../test-utils/wait.js');

const CloudWatchLogsSDK = require('aws-sdk/clients/cloudwatchlogs');
const cloudWatchLogsSdk = new CloudWatchLogsSDK({
  region: 'us-west-2',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
}); 
const getLogEvents = util.promisify(cloudWatchLogsSdk.getLogEvents).bind(cloudWatchLogsSdk);

const CloudWatchLog = require('../../lib/control/cloudwatch-log.js');
const removeCharacter = require('../../lib/utils/remove-character.js');

describe('cloudwatch-log', function() {
  this.timeout(100000);
  itSlowly('should be able to run through app functionality', async () => {
    const log = new CloudWatchLog(cloudWatchLogsSdk, config.cloudWatchLog.testLogGroupName);

    // Put a single log into CloudWatch. A log stream will automatically be created with
    // the current ISO time as its name
    let putResults = await log.put('Some log');
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 1);
    assert.strictEqual(putResults.logEvents[0].message, 'Some log');
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    const originalLogStreamName = putResults.logStreamName;

    // An array of log events can be provided
    putResults = await log.put([
      {
        message: 'Event message 1',
        timestamp: Date.now()
      },
      {
        message: 'Event message 2',
        timestamp: Date.now()
      }
    ]);
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 2);
    assert.strictEqual(putResults.logEvents[0].message, 'Event message 1');
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(putResults.logEvents[1].message, 'Event message 2');
    assert.strictEqual(typeof putResults.logEvents[1].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    // An array of non log events can be provided
    putResults = await log.put([
      {
        noMessage: 'Non-message 1',
      },
      'String in an array'
    ]);
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 2);
    assert.strictEqual(putResults.logEvents[0].message, JSON.stringify({noMessage: 'Non-message 1'}));
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(putResults.logEvents[1].message, 'String in an array');
    assert.strictEqual(typeof putResults.logEvents[1].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    // Manually create a new log stream, with a provided name. Default is the current ISO time
    const customLogStreamName = `${(new Date()).toISOString()}-cloudwatch-log-example`;
    const startResults = await log.start(customLogStreamName);
    assert.strictEqual(startResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(startResults.logStreamName, removeCharacter(customLogStreamName, ':', '-'));
  
    putResults = await log.put('This log goes into the new stream');
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 1);
    assert.strictEqual(putResults.logEvents[0].message, 'This log goes into the new stream');
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    // Create a new log object and continue in the same log stream
    const newLog = new CloudWatchLog(cloudWatchLogsSdk, config.cloudWatchLog.testLogGroupName);
    const streamInfo = {
      streamName: customLogStreamName,
      sequenceToken: putResults.nextSequenceToken
    };
    const newPutResult = await newLog.put('This is a new log object in the same stream', streamInfo);
    assert.strictEqual(newPutResult.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof newPutResult.logStreamName, 'string');
    assert.strictEqual(Array.isArray(newPutResult.logEvents), true);
    assert.strictEqual(newPutResult.logEvents.length, 1);
    assert.strictEqual(newPutResult.logEvents[0].message, 'This is a new log object in the same stream');
    assert.strictEqual(typeof newPutResult.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof newPutResult.nextSequenceToken, 'string');

    // Check that the events exist in CloudWatch
    await wait(2000);
    let existingLogEvents = await getLogEvents({logGroupName: config.cloudWatchLog.testLogGroupName, logStreamName: originalLogStreamName});

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);
    
    let foundMatch = existingLogEvents.events.find((event) => event.message === 'Some log');
    assert.strictEqual(foundMatch.message, 'Some log');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'Event message 1');
    assert.strictEqual(foundMatch.message, 'Event message 1');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'Event message 2');
    assert.strictEqual(foundMatch.message, 'Event message 2');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === JSON.stringify({noMessage: 'Non-message 1'}));
    assert.strictEqual(foundMatch.message, JSON.stringify({noMessage: 'Non-message 1'}));
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'String in an array');
    assert.strictEqual(foundMatch.message, 'String in an array');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    existingLogEvents = await getLogEvents({logGroupName: config.cloudWatchLog.testLogGroupName, logStreamName: removeCharacter(customLogStreamName, ':', '-')});

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    foundMatch = existingLogEvents.events.find((event) => event.message === 'This log goes into the new stream');
    assert.strictEqual(foundMatch.message, 'This log goes into the new stream');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'This is a new log object in the same stream');
    assert.strictEqual(foundMatch.message, 'This is a new log object in the same stream');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });
});
