'use strict';

/**
 * Helper will pause operation for the given timeout with async support
 * 
 * @param {number} timeout Amount of time to wait in ms
 * 
 * @returns {Promise} Promise that will resolve when the timeout is finished
 */
module.exports = async (timeout) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
};
