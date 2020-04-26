'use strict';

/**
 * Default configuration file. Any values also present in the .conf.js file will be overridden
 * The configurations have two layers
 * 1. Category
 * 2. Value
 * 
 * This system does not support nesting beyond these two layers. Any object value will
 * be replaced with the entire object value in the secret config
 * 
 * All values marked as `undefined` must be defined in the .conf.js file
 */
module.exports = {
  /**
   * General AWS related configurations
   */
  aws: {
    /**
     * Access key ID to use when debugging
     */
    accessKeyId: null,

    /**
     * Access key secret to use when debugging
     */
    secretAccessKey: null
  },

  /**
   * CloudWatchLog specific configurations
   */
  cloudWatchLog: {
    /**
     * Characters that cannot be in log stream name
     */
    logStreamRestrictedCharacters: [
      ':'
    ],

    /**
     * Log Group Name to use when testing
     */
    testLogGroupName: '/logs/test'
  }
};
