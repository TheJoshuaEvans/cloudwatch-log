'use strict';

/**
 * Helper function returns a promise with externalized resolve and reject methods
 */
const defer = () => {
  let res, rej;
  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  promise.resolve = res;
  promise.reject = rej;

  return promise;
};

module.exports = defer;
