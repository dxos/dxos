//
// Copyright 2026 DXOS.org
//

import { type Op, type Path, getAt, isContainer } from './ops.ts';

/** Deterministic PRNG so failing seeds reproduce. */
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)],
    chance: (probability: number) => next() < probability,
  };
};

export type Random = ReturnType<typeof createRandom>;

/** Every container and text in a document, with its path. */
const collect = (root: unknown): { maps: Path[]; lists: Path[]; texts: Path[] } => {
  const maps: Path[] = [];
  const lists: Path[] = [];
  const texts: Path[] = [];
  const walk = (value: unknown, path: Path) => {
    if (typeof value === 'string') {
      texts.push(path);
    } else if (Array.isArray(value)) {
      lists.push(path);
      value.forEach((entry, index) => walk(entry, [...path, index]));
    } else if (isContainer(value)) {
      maps.push(path);
      for (const [key, entry] of Object.entries(value)) {
        walk(entry, [...path, key]);
      }
    }
  };
  walk(root, []);
  return { maps, lists, texts };
};

const KEYS = ['a', 'b', 'c', 'title', 'items'];

/** A small random value that is sometimes nested, so ops land inside lists of maps and texts in lists. */
export const randomValue = (random: Random, depth = 0, tag = ''): unknown => {
  const roll = random.int(depth > 1 ? 3 : 6);
  switch (roll) {
    case 0:
      return `${tag}t${random.int(1000)}`;
    case 1:
      return random.int(100);
    case 2:
      return random.chance(0.5);
    case 3:
      return { title: `${tag}n${random.int(1000)}`, items: [] };
    case 4:
      return [randomValue(random, depth + 1, tag), randomValue(random, depth + 1, tag)];
    default:
      return { [random.pick(KEYS)]: randomValue(random, depth + 1, tag) };
  }
};

/**
 * A random op that is valid against `root`. `tag` marks inserted text and values, so an identity
 * check can tell which writer produced what survives.
 */
export const randomOp = (random: Random, root: unknown, tag = ''): Op | undefined => {
  const { maps, lists, texts } = collect(root);
  for (let attempt = 0; attempt < 10; attempt++) {
    switch (random.int(5)) {
      case 0: {
        if (texts.length === 0) {
          break;
        }
        const path = random.pick(texts);
        const text = getAt(root, path);
        if (typeof text !== 'string') {
          break;
        }
        const index = random.int(text.length + 1);
        const remove = random.chance(0.4) ? random.int(Math.min(4, text.length - index) + 1) : 0;
        const insert = random.chance(0.8) ? `${tag}${'xyz'.slice(0, 1 + random.int(3))}` : '';
        if (remove === 0 && insert.length === 0) {
          break;
        }
        return { type: 'splice', path, index, remove, insert };
      }
      case 1: {
        const path = random.pick(maps);
        return { type: 'put', path: [...path, random.pick(KEYS)], value: randomValue(random, path.length, tag) };
      }
      case 2: {
        const path = random.pick(maps);
        const node = getAt(root, path);
        const keys = isContainer(node) && !Array.isArray(node) ? Object.keys(node) : [];
        if (keys.length === 0) {
          break;
        }
        return { type: 'del', path: [...path, random.pick(keys)] };
      }
      case 3: {
        if (lists.length === 0) {
          break;
        }
        const path = random.pick(lists);
        const node = getAt(root, path);
        const length = Array.isArray(node) ? node.length : 0;
        const count = 1 + random.int(2);
        return {
          type: 'insert',
          path: [...path, random.int(length + 1)],
          values: Array.from({ length: count }, () => randomValue(random, path.length + 1, tag)),
        };
      }
      case 4: {
        if (lists.length === 0) {
          break;
        }
        const path = random.pick(lists);
        const node = getAt(root, path);
        const length = Array.isArray(node) ? node.length : 0;
        if (length === 0) {
          break;
        }
        const index = random.int(length);
        if (random.chance(0.3)) {
          return { type: 'put', path: [...path, index], value: randomValue(random, path.length + 1, tag) };
        }
        return { type: 'remove', path: [...path, index], count: 1 + random.int(Math.min(3, length - index)) };
      }
    }
  }
  return undefined;
};

export const initialDocument = () => ({
  title: 'hello world',
  items: [{ title: 'one', items: ['alpha'] }, { title: 'two', items: [] }, 'three'],
  meta: { a: 1, b: { c: 'nested text' } },
});
