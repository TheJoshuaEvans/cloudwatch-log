'use strict';

/**
 * Removes all instances of a character from a provided string
 * 
 * @param {string} original String to remove characters from
 * @param {string} toRemove Character to remove
 * @param {string} toReplace Character to add in the removed character's place
 * 
 * @return {string} New string with desired modifications
 */
const removeCharacter = (original, toRemove, toReplace = '-') => {
  let currentResult = original;
  if (!currentResult) return;

  let nextResult = currentResult.replace(toRemove, toReplace);
  while (nextResult !== currentResult) {
    currentResult = nextResult;

    nextResult = currentResult.replace(toRemove, toReplace);
  }
  return currentResult;
};

module.exports = removeCharacter;
