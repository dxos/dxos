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

// 256 ^ 3 ~= 16M.
const bits = 8; // Bits per section.
const length = Math.pow(2, bits);

const parts: string[] = ['a', 'b', 'c'];
const parser = new Parser().bit8('a').bit8('b').bit8('c');
const types = ['adjectives', 'adjectives', 'animals'];

const range = types.reduce((result, _, i) => result * data[types[i]].length, 1);
const bitlength = Math.log2(range);
const bytelength = bitlength / 8;

export const generateKey = () => crypto.randomBytes(bytelength);

/**
 * Generate 3-work phrase.
 * NOTE: Collision rate requires uniquenss checking.
 * @param key
 */
export const generateName = (key: Buffer): string => {
  // TODO(burdon): Regenerate until total length is below threshold?
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

/**
 * Parses the 3-word phrase.
 * @param name
 */
export const parseName = (name: string): Buffer => {
  const binary = name.split('-').map((word, i) => {
    const list = data[types[i]];
    return list.indexOf(word);
  }).map(n => n.toString(2).padStart(bits, '0')).join('');

  return Buffer.from(parseInt(binary, 2).toString(16).padStart(2 * types.length * bits / 8, '0'), 'hex');
};
