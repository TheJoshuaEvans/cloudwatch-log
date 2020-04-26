'use strict';

const assert = require('assert');

const removeCharacter = require('../../lib/utils/remove-character.js');

describe('remove-character', function() {
  it('should remove : character from ISO timestamp with default settings', async () => {
    const result = removeCharacter('2020-04-26T03:36:38.142Z', ':');
    assert.strictEqual(result, '2020-04-26T03-36-38.142Z');
  });

  it('should remove : character from ISO timestamp with explicit replace character', async () => {
    const result = removeCharacter('2020-04-26T03:36:38.142Z', ':', 'replace');
    assert.strictEqual(result, '2020-04-26T03replace36replace38.142Z');
  });
});
