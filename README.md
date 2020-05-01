# CloudWatch Log
Simple CloudWatch logging utility

# Install
```
npm install --save cloudwatch-log
```

# Usage
Usage is meant to be as simple as possible. On instantiation, this class takes a CloudWatchLogsSDK instance and the name of an existing CloudWatch Log Group. You can then use the `cloudWatchLog.put` function to add data to the CloudWatch Log Group, or use `cloudWatchLog.start` to create a new Log Stream with a custom name
```js
// Import libraries
const CloudWatchLogsSDK = require('aws-sdk/clients/cloudwatchlogs');
const CloudWatchLog = require('cloudwatch-log');

// Instantiate the logger
const sdk = new CloudWatchLogsSDK({apiVersion: '2014-03-28', region: 'us-east-1'})
const log = new CloudWatchLog(sdk, '/log/group/name');

// Put a single log into CloudWatch. A log stream will automatically be created with the current time as its name
await log.put('Some log');

// An array of log events can be provided
await log.put([
  {
    message: 'Event message 1',
    timestamp: Date.now()
  },
  {
    message: 'Event message 2',
    timestamp: Date.now()
  }
]);

// Manually create a new log stream with a provided name. Default is the current time
const streamName = `${(new Date()).toISOString()}-cloudwatch-log-example`;
await log.start(streamName);
const { nextSequenceToken:sequenceToken } = await log.put('This log goes into the new stream');

// Create a new logger and continue where we left off
const newLog = new CloudWatchLog(sdk, '/log/group/name');
await log.put('This goes into the same stream', {
  streamName,
  sequenceToken
});
```
