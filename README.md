# CloudWatch Log
Simple CloudWatch logging utility

# Install
```
npm install --save cloudwatch-log
```

# Examples
This library is designed to be used with an async/await pattern and exclusively uses promises. Callbacks are not currently supported

## Simple Usage
This library is designed to be as easy to use as possible
```js
// Import libraries
const CloudWatchLogsSDK = require('@aws-sdk/client-cloudwatch-logs');
const CloudWatchLog = require('cloudwatch-log');

// Instantiate the logger
const sdk = new CloudWatchLogsSDK({region: 'us-east-1'});
const log = new CloudWatchLog(sdk, '/log/group/name');

// Put a single log into CloudWatch
// A log stream will automatically be created with the current time as its name
await log.put('Some log');

// An array can also be provided
await log.put([
  'Event message 1',
  'Event message 2'
]);
```

## Custom Log Stream Names
Each instance of the CloudWatchLog library is meant to be used with a single log stream. To use a custom log stream name, supply the desired name in the opts on instantiation
```js
// Instantiate the logger
const customStreamNameLog = new CloudWatchLog(sdk, {
  logGroupName: '/log/group/name',
  logStreamName: 'custom-log-stream-name'
});

// Put an item into the custom log steam
await customStreamNameLog.put('Custom stream log');
```

## Non-string Log Events
The `put` method supports parameters of types other than strings. Objects will automatically be converted into strings using `JSON.stringify`. The [LogEvent](./lib/classes/log-event.js) helper class can also be used to take greater control of the events being put into CloudWatch. Use of the [LogEvent](./lib/classes/log-event.js) class is also required to supply custom timestamps to individual log events
```js
await log.put({
  testText: 'Objects are automatically stringified'
});

await log.put([
  {
    testNumber: 1337,
    testText: 'Types can also be freely mixed'
  },
  'Like this',
  new CloudWatchLog.LogEvent('Here is an explicit log event with a custom timestamp', 12345678)
])
```

## Smart Buffering
CloudWatch Logs has a rate limit of 5 requests per second. This limit cannot (currently) be increased. This library uses a "smart buffering" strategy to prevent throttling errors

`put` requests will be delivered right away if there has been more than 200ms (one fifth of a second) since the last request. If there has been less than 200ms since the last request the events in the `put` request will be added to a buffer to be run at the next available interval. The promises returned from buffered requests will only resolve once the `put` request has actually been made

Additionally, this library will never throw errors in the event of problems with the CloudWatch API, so it is safe to lazily call the `put` requests
```js
await log.put('This event will be sent right away');

await log.put('This event will be sent 200ms after the previous event was sent at the earliest')

for (let i=0; i<10; i++) {
  // All of these requests will be buffered into a single request
  log.put(`Buffered request number ${i}`);
}
```
