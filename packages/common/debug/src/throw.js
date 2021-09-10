//
// Copyright 2020 DXOS.org
//

/* eslint-disable jest/no-export, jest/no-disabled-tests, jest/expect-expect */

/**
 * Wrapper for async jest tests.
 * @param {Function} test - Async test
 * @param errType
 * @return {Promise<void>}
 */
export const expectToThrow = async (test, errType = Error) => {
  let thrown;
  try {
    await test();
  } catch (err) {
    thrown = err;
  }

  if (!thrown instanceof errType) {
    throw new Error(`Expected function to throw instance of ${errType.prototype.name}`)
  }
};
