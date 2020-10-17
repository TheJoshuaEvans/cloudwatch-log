'use strict';

const assert = require('assert');
const util = require('util');
const config = require('../../config.js');

const itSlowly = require('../test-utils/it-slowly.js');
const wait = require('../test-utils/wait.js');

const LogEvent = require('../../lib/classes/log-event.js');

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
  let log, originalLogStreamName;
  before(() => {
    const opts = {
      logGroupName: config.cloudWatchLog.testLogGroupName
    };
    log = new CloudWatchLog(cloudWatchLogsSdk, opts);
  });

  it('should instantiate with string opts (legacy support)', async () => {
    const legacyLog = new CloudWatchLog(cloudWatchLogsSdk, 'Test Log Group');
    assert.strictEqual(legacyLog.opts.logGroupName, 'Test Log Group');
  });
  
  it('should not throw an error on put failure', async () => {
    const putError = new Error('Put error');
    const putThrowLog = new CloudWatchLog(
      {
        putLogEvents: (opts, cb) => {
          cb(putError);
        }
      },
      {
        logGroupName: 'testGroup',
        logStreamName: 'testStream',
        nextSequenceToken: 'testToken'
      }
    );
    
    const res = await putThrowLog.put('test');
    assert.strictEqual(res.error, putError);
  });

  it('should not throw an error on start failure', async () => {
    const startError = new Error('Start error');
    const putThrowLog = new CloudWatchLog(
      {
        createLogStream: (opts, cb) => {
          cb(startError);
        }
      },
      {
        logGroupName: 'testGroup',
        logStreamName: 'testStream',
        nextSequenceToken: 'testToken'
      }
    );
    
    const res = await putThrowLog.start();
    assert.strictEqual(res.error, startError);
  });

  itSlowly('should put single log', async () => {
    const putResults = await log.put('Some log');
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 1);
    assert.strictEqual(putResults.logEvents[0].message, 'Some log');
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    originalLogStreamName = putResults.logStreamName;

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: originalLogStreamName
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    const foundMatch = existingLogEvents.events.find((event) => event.message === 'Some log');
    assert.strictEqual(foundMatch.message, 'Some log');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });

  itSlowly('should put an array of log events', async () => {
    const putResults = await log.put([
      new LogEvent('Event message 1'),
      new LogEvent('Event message 2')
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

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: originalLogStreamName
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    let foundMatch = existingLogEvents.events.find((event) => event.message === 'Event message 1');
    assert.strictEqual(foundMatch.message, 'Event message 1');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'Event message 2');
    assert.strictEqual(foundMatch.message, 'Event message 2');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });

  itSlowly('should put an array of non log event', async () => {
    const putResults = await log.put([
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

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: originalLogStreamName
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    let foundMatch = existingLogEvents.events.find((event) => event.message === JSON.stringify({noMessage: 'Non-message 1'}));
    assert.strictEqual(foundMatch.message, JSON.stringify({noMessage: 'Non-message 1'}));
    assert.strictEqual(typeof foundMatch.timestamp, 'number');

    foundMatch = existingLogEvents.events.find((event) => event.message === 'String in an array');
    assert.strictEqual(foundMatch.message, 'String in an array');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });

  itSlowly('should buffer requests', async () => {
    for (let i=0; i<5; i++) {
      (async () => {
        if (i === 0) {
          // The first request should be sent right away
          const putResults = await log.put('Buffered request 0');
          assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
          assert.strictEqual(typeof putResults.logStreamName, 'string');
          assert.strictEqual(Array.isArray(putResults.logEvents), true);
          assert.strictEqual(putResults.logEvents.length, 1);
          assert.strictEqual(putResults.logEvents[0].message, 'Buffered request 0');
          assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
          return;
        }

        // The rest should be buffered and all sent in a single request
        const putResults = await log.put(`Buffered request ${i}`);
        assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
        assert.strictEqual(typeof putResults.logStreamName, 'string');
        assert.strictEqual(Array.isArray(putResults.logEvents), true);
        assert.strictEqual(putResults.logEvents.length, 4);
        assert.strictEqual(putResults.logEvents[0].message, 'Buffered request 1');
        assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
        assert.strictEqual(putResults.logEvents[1].message, 'Buffered request 2');
        assert.strictEqual(typeof putResults.logEvents[1].timestamp, 'number');
        assert.strictEqual(putResults.logEvents[2].message, 'Buffered request 3');
        assert.strictEqual(typeof putResults.logEvents[2].timestamp, 'number');
        assert.strictEqual(putResults.logEvents[3].message, 'Buffered request 4');
        assert.strictEqual(typeof putResults.logEvents[3].timestamp, 'number');
      })();
      await wait(25);
    }

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: originalLogStreamName
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    for (let i=0; i<5; i++) {
      const foundMatch = existingLogEvents.events.find((event) => event.message === `Buffered request ${i}`);
      assert.strictEqual(typeof foundMatch.timestamp, 'number');
    }
  });

  let customLogStreamName, nextSequenceToken;
  itSlowly('should be able to create new stream with new log instance', async () => {
    customLogStreamName = `${(new Date()).toISOString()}-cloudwatch-log-example`;
    const opts = {
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: customLogStreamName
    };
    const newLog = new CloudWatchLog(cloudWatchLogsSdk, opts);
    const startResults = await newLog.start();
    assert.strictEqual(startResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(startResults.logStreamName, removeCharacter(customLogStreamName, ':', '-'));
  
    const putResults = await newLog.put('This log goes into the new stream');
    nextSequenceToken = putResults.nextSequenceToken;
    assert.strictEqual(putResults.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof putResults.logStreamName, 'string');
    assert.strictEqual(Array.isArray(putResults.logEvents), true);
    assert.strictEqual(putResults.logEvents.length, 1);
    assert.strictEqual(putResults.logEvents[0].message, 'This log goes into the new stream');
    assert.strictEqual(typeof putResults.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof putResults.nextSequenceToken, 'string');

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: removeCharacter(customLogStreamName, ':', '-')
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    const foundMatch = existingLogEvents.events.find((event) => event.message === 'This log goes into the new stream');
    assert.strictEqual(foundMatch.message, 'This log goes into the new stream');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });

  itSlowly('should continue where we left off with a new logger instance', async () => {
    const opts = {
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: customLogStreamName,
      nextSequenceToken
    };
    const newLog = new CloudWatchLog(cloudWatchLogsSdk, opts);
    const newPutResult = await newLog.put('This is a new log object in the same stream');
    assert.strictEqual(newPutResult.logGroupName, config.cloudWatchLog.testLogGroupName);
    assert.strictEqual(typeof newPutResult.logStreamName, 'string');
    assert.strictEqual(Array.isArray(newPutResult.logEvents), true);
    assert.strictEqual(newPutResult.logEvents.length, 1);
    assert.strictEqual(newPutResult.logEvents[0].message, 'This is a new log object in the same stream');
    assert.strictEqual(typeof newPutResult.logEvents[0].timestamp, 'number');
    assert.strictEqual(typeof newPutResult.nextSequenceToken, 'string');

    await wait(1000); // Wait for eventual consistency
    const existingLogEvents = await getLogEvents({
      logGroupName: config.cloudWatchLog.testLogGroupName,
      logStreamName: removeCharacter(customLogStreamName, ':', '-')
    });

    assert.strictEqual(typeof existingLogEvents, 'object');
    assert.strictEqual(Array.isArray(existingLogEvents.events), true);

    const foundMatch = existingLogEvents.events.find((event) => event.message === 'This is a new log object in the same stream');
    assert.strictEqual(foundMatch.message, 'This is a new log object in the same stream');
    assert.strictEqual(typeof foundMatch.timestamp, 'number');
  });
});
