'use strict';

const assert = require('assert');

const defer = require('../../lib/utils/defer.js');

describe('defer', function() {
  it('should resolve promise', async () => {
    const promise = defer();
    promise.resolve('success');

    const result = await promise;
    assert.strictEqual(result, 'success');
  });

  it('should reject promise', async () => {
    const promise = defer();
    promise.reject(new Error('failure'));

    try {
      await promise;
      assert.fail('should have thrown an error');
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.strictEqual(e.message, 'failure');
    }
  });
});
