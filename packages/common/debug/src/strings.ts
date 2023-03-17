//
// Copyright 2020 DXOS.org
//

export const truncate = (str = '', length = 8, pad: boolean | string = false) => {
  if (str.length >= length - 1) {
    return str.substring(0, length - 1) + '…';
  } else {
    return pad ? str.padEnd(length, typeof pad === 'boolean' ? ' ' : pad[0]) : str;
  }
};

export type TruncateKeyOptions = {
  length?: number;
  start?: boolean;
};

export const truncateKey = (key: any, { length = 8, start }: TruncateKeyOptions = {}) => {
  const str = String(key);
  if (str.length <= length) {
    return str;
  }

  return start
    ? `${str.slice(0, length)}...`
    : `${str.substring(0, length / 2)}...${str.substring(str.length - length / 2)}`;
};
