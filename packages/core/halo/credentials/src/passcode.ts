//
// Copyright 2019 DXOS.org
//

/**
 * Generates a numeric passcode.
 * @param {number} length
 * @returns {string}
 */
export const generatePasscode = (length = 4) => {
  let passcode = '';
  for (let i = 0; i < length; i++) {
    passcode += `${Math.floor(Math.random() * 10)}`;
  }

  return passcode;
};
