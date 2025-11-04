//
// Copyright 2024 DXOS.org
//

import { arrayToHex } from '@dxos/util';

export type ActorID = string & { __ActorID: never };

export type Item = {
  key: string;
  value: Uint8Array;
  digest: Uint8Array;
};

export const makeItem = async (key: string, value: Uint8Array): Promise<Item> => {
  const keyBytes = textEncoder.encode(key);
  const data = new Uint8Array(keyBytes.length + value.length);
  data.set(keyBytes, 0);
  data.set(value, keyBytes.length);
  const digest = await crypto.subtle.digest({ name: 'SHA-256' }, data);
  return {
    key,
    value,
    digest: new Uint8Array(digest),
  };
};

/**
 * The level the item is placed at is determined as the number of leading zeroes in the item's digest in a given base.
 *
 * This function is hardcoded to use base 16.
 *
 * Example:
 *   XXXXXXXX - level 0
 *   0XXXXXXX - level 1
 *   00XXXXXX - level 2
 */
export const getLevel = (digest: Uint8Array): number => {
  let level = 0;
  for (let i = 0; i < digest.length; i++) {
    const byte = digest[i];
    // left nibble
    if (byte >> 4 === 0) {
      level++;
    } else {
      break;
    }
    // right nibble
    if ((byte & 0x0f) === 0) {
      level++;
    } else {
      break;
    }
  }
  return level;
};

export const formatDigest = (digest: Uint8Array) => arrayToHex(digest.buffer);

export const getLevelHex = (digest: string): number => {
  let level = 0;
  for (let i = 0; i < digest.length; i++) {
    if (digest[i] === '0') {
      level++;
    } else {
      break;
    }
  }
  return level;
};

export const digestEquals = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const textEncoder = new TextEncoder();
