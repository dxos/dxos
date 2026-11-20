//
// Copyright 2026 DXOS.org
//

const STOPWORDS = new Set(
  (
    'a an the and or but if of to in on at for from by with about into is are was were be been being am i me my ' +
    'we our you your he she it its they them their this that these those what which who whom does do did done ' +
    'have has had should would could can will just than then so not no yes please hi hello now also any some ' +
    'there here when where why how after before'
  ).split(' '),
);

/** Lowercase word tokens, with a crude suffix strip so `deploying`/`deployed`/`deploys` share a stem. */
export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem);

export const stem = (word: string): string => {
  for (const suffix of ['ing', 'ed', 's']) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix) && !word.endsWith('ss')) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
};

export const slug = (text: string): string => tokenize(text).slice(0, 3).join('-') || 'misc';

/** FNV-1a, run twice with different offsets, as a stand-in for a content hash. */
export const contentHash = (text: string): string => {
  const fnv = (seed: number) => {
    let hash = seed;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  };
  return fnv(0x811c9dc5) + fnv(0x01000193);
};

const DIMENSIONS = 256;

/** Hashed bag-of-words embedding: no model, but cosine similarity still rewards shared stems. */
export const embed = (text: string): number[] => {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  for (const token of tokenize(text)) {
    const hash = Number.parseInt(contentHash(token).slice(0, 8), 16);
    vector[hash % DIMENSIONS] += hash & 1 ? 1 : -1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
};

export const cosine = (left: number[], right: number[]): number =>
  left.reduce((sum, value, index) => sum + value * right[index], 0);

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** ULID: 48-bit millisecond time + 80 bits of randomness, Crockford base32 (the id format the types document). */
export const ulid = (time: number, random: () => number): string => {
  let timePart = '';
  let remaining = time;
  for (let index = 0; index < 10; index++) {
    timePart = CROCKFORD[remaining % 32] + timePart;
    remaining = Math.floor(remaining / 32);
  }
  let randomPart = '';
  for (let index = 0; index < 16; index++) {
    randomPart += CROCKFORD[Math.floor(random() * 32)];
  }
  return timePart + randomPart;
};

/** Mulberry32, so a seeded story renders the same ids on every load. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
