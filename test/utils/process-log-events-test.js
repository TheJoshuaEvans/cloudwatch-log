'use strict';

const assert = require('assert');

const LogEvent = require('../../lib/classes/log-event.js');

const processLogEvents = require('../../lib/utils/process-log-events.js');

describe('process-log-events', function() {
  it('should process single string', async () => {
    const input = 'Single string test';
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 1);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, input);
    assert.strictEqual(typeof results[0].timestamp, 'number');
  });

  it('should process a non-string single element', async () => {
    const input = 123456;
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].message, input.toString());
    assert.strictEqual(typeof results[0].timestamp, 'number');
  });

  it('should process an object single element', async () => {
    const input = {
      testKey1: 'value1',
      testKey2: 1244,
      testKey3: [
        {
          testArrObj: 'arrValue'
        },
        12345
      ]
    };
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 1);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, JSON.stringify(input));
    assert.strictEqual(typeof results[0].timestamp, 'number');
  });
  
  it('should process multiple strings', async () => {
    const input = [
      'Multi string test 1',
      'Multi string test 2'
    ];
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 2);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, input[0]);
    assert.strictEqual(typeof results[0].timestamp, 'number');
    assert.strictEqual(results[1].message, input[1]);
    assert.strictEqual(typeof results[1].timestamp, 'number');
  });

  it('should process existing LogEvent objects', async () => {
    const input = [
      new LogEvent('Complete object', Date.now()),
      new LogEvent('Incomplete object')
    ];
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 2);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, input[0].message);
    assert.strictEqual(results[0].timestamp, input[0].timestamp);
    assert.strictEqual(results[1].message, input[1].message);
    assert.strictEqual(typeof results[1].timestamp, 'number');
  });

  it('should process array of non-message objects', async () => {
    const input = [
      {
        notMessage: 'non-message-object1',
        timestamp: Date.now()
      },
      {
        anotherNotMessage: 'no-messages'
      }
    ];
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 2);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, JSON.stringify(input[0]));
    assert.strictEqual(typeof results[0].timestamp, 'number');
    assert.strictEqual(results[1].message, JSON.stringify(input[1]));
    assert.strictEqual(typeof results[1].timestamp, 'number');
  });

  it('should process hybrid input', async () => {
    const input = [
      new LogEvent('Complete object', Date.now()),
      new LogEvent('Incomplete object'),
      'String input',
      {
        noMessage: 'No messages on this object'
      }
    ];
    const results = processLogEvents(input);

    assert.strictEqual(results.length, 4);
    results.forEach(result => assert.ok(result instanceof LogEvent));
    assert.strictEqual(results[0].message, input[0].message);
    assert.strictEqual(results[0].timestamp, input[0].timestamp);
    assert.strictEqual(results[1].message, input[1].message);
    assert.strictEqual(typeof results[1].timestamp, 'number');
    assert.strictEqual(results[2].message, input[2]);
    assert.strictEqual(typeof results[2].timestamp, 'number');
    assert.strictEqual(results[3].message, JSON.stringify(input[3]));
    assert.strictEqual(typeof results[3].timestamp, 'number');
  });
});
