//
// Copyright 2020 DXOS.org
//

/**
 * Wrapper for async tests.
 * @param {Function} test - Async test
 * @param errType
 * @return {Promise<void>}
 */
export const expectToThrow = async (test: () => void, errType = Error) => {
  let thrown;
  try {
    await test();
  } catch (err) {
    thrown = err;
  }

  if (thrown === undefined || !(thrown instanceof errType)) {
    throw new Error(
      `Expected function to throw instance of ${errType.prototype.name}`
    );
  }
};
