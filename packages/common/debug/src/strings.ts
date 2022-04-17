//
// Copyright 2020 DXOS.org
//

export const truncate = (str = '', length: number, pad: boolean | string = false) => {
  if (str.length >= (length - 1)) {
    return str.substring(0, length - 1) + '…';
  } else {
    return pad ? str.padEnd(length, typeof pad === 'boolean' ? ' ' : pad[0]) : str;
  }
};

export const truncateKey = (str = '', n = 3) => {
  if (str.length < n * 2 + 2) {
    return str;
  }

  return `${str.substring(0, n)}..${str.substring(str.length - n)}`;
};
