# CloudWatch Log
Simple CloudWatch logging utility

# Install
```
npm install --save cloudwatch-log
```

# Basic Usage
```js
const CloudWatchLogsSDK = require('aws-sdk/clients/cloudwatchlogs');
const CloudWatchLog = require('cloudwatch-log');

// Instantiate the logger
const log = new CloudWatchLog(new CloudWatchLogsSDK({apiVersion: '2014-03-28', region: 'us-east-1'}), '/log/group/name');

// Put a single log into CloudWatch. A log stream will automatically be created with
// the current time as its name
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
await log.start(`${(new Date()).toISOString()}-cloudwatch-log-example`);
await log.put('This log goes into the new stream');
```
