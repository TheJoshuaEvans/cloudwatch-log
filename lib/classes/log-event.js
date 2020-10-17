'use strict';

class LogEvent {
  /**
   * Constructs a log event object
   *
   * @param {string} message Message to save in CloudWatch
   * @param {number} timestamp Unix epoch timestamp
   */
  constructor(message, timestamp = Date.now()) {
    /**
     * The message being relayed to CloudWatch
     */
    this.message = message;

    /**
     * Unix epoch timestamp for this event
     */
    this.timestamp = timestamp;
  }

  /**
   * Copy constructor takes an existing log event and returns a new one with the same values
   * 
   * @param {LogEvent} event Existing log event object
   */
  static copy(event) {
    return new LogEvent(event.message, event.timestamp);
  }
}

module.exports = LogEvent;
