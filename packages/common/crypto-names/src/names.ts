//
// Copyright 2022 DXOS.org
//

import { Parser } from 'binary-parser';
import crypto from 'hypercore-crypto';

// Data sources
// https://github.com/skjorrface/animals.txt/blob/master/animals.txt (500 animals)
// https://gist.github.com/Xeoncross/5381806b18de1f395187 (900 positive adjectives)

import words from '../data/words.json';

// TODO(burdon): Make exensible without breaking existing words (e.g., add byte and word).
// TODO(burdon): Store hash of words and check consistent in code.
const data: { [key: string ]: string[] } = words;

// 256 ^ 3 = 2M (pad 3 8-bit words).
const parts: string[] = ['a', 'b', 'c'];
const parser = new Parser().bit8('a').bit8('b').bit8('c');
const types = ['adjectives', 'adjectives', 'animals'];
const length = 256;

const range = types.reduce((result, _, i) => result * data[types[i]].length, 1);
const bitlength = Math.log2(range);
const bytelength = bitlength / 8;

export const generateKey = () => {
  return crypto.randomBytes(bytelength);
};

// TODO(burdon): Regenerate if repeated words?
export const generateName = (key: Buffer) => {
  const value = parser.parse(key);
  const words = parts.map((part, i) => {
    const list = data[types[i]];
    if (list.length !== length) {
      throw new Error(`Invalid list: ${types[i]}:${list.length}`);
    }

    return list[value[part]];
  });
  return words.join('-');
};

export const parseName = (name: string): Buffer => {
  const binary = name.split('-').map((word, i) => {
    const list = data[types[i]];
    return list.indexOf(word);
  }).map(n => n.toString(2).padStart(8, '0')).join('');
  return Buffer.from(parseInt(binary, 2).toString(16).padStart(types.length * 2, '0'), 'hex');
};
