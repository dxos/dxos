//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type DocChange, computeDocChanges } from './doc-sync.ts';

describe('computeDocChanges', () => {
  test('no changes when the documents match', ({ expect }) => {
    expect(computeDocChanges('one\ntwo', 'one\ntwo')).toEqual([]);
  });

  test('one changed line does not touch the rest', ({ expect }) => {
    const current = 'one\ntwo\nthree';
    const next = 'one\nTWO\nthree';
    const changes = computeDocChanges(current, next);

    expect(changes.length).toBe(1);
    expect(changes[0].from).toBeGreaterThan(0);
    expect(changes[0].to).toBeLessThan(current.length);
    expect(apply(current, changes)).toBe(next);
  });

  test('an appended line leaves the document above it alone', ({ expect }) => {
    const current = 'one\ntwo\nthree';
    const next = `${current}\nfour`;
    const changes = computeDocChanges(current, next);

    expect(changes.length).toBe(1);
    expect(changes[0].from).toBe(current.length);
    expect(changes[0].to).toBe(current.length);
    expect(apply(current, changes)).toBe(next);
  });

  test('an empty document on either side replaces outright', ({ expect }) => {
    expect(computeDocChanges('', 'one')).toEqual([{ from: 0, to: 0, insert: 'one' }]);
    expect(computeDocChanges('one', '')).toEqual([{ from: 0, to: 3, insert: '' }]);
  });

  test('a document past `maxLength` replaces outright', ({ expect }) => {
    const current = 'one\ntwo';
    const next = 'one\nTWO';
    expect(computeDocChanges(current, next, { maxLength: 4 })).toEqual([{ from: 0, to: current.length, insert: next }]);
  });

  test('the changes reproduce the target on 2000 random edits', ({ expect }) => {
    for (let seed = 1; seed <= 2000; seed++) {
      const random = makeRandom(seed);
      const current = makeDocument(random, 1 + Math.floor(random() * 40));
      const next = random() < 0.1 ? makeDocument(random, 1 + Math.floor(random() * 40)) : mutate(current, random);
      const changes = computeDocChanges(current, next);

      expect([`seed ${seed}`, apply(current, changes)]).toEqual([`seed ${seed}`, next]);
    }
  });
});

/** Changes come back ascending and non-overlapping, so one pass applies them. */
const apply = (current: string, changes: DocChange[]): string => {
  let result = '';
  let position = 0;
  for (const change of changes) {
    result += current.slice(position, change.from) + change.insert;
    position = change.to;
  }

  return result + current.slice(position);
};

// Deterministic PRNG so a failure is reproducible from its seed alone.
const makeRandom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const makeDocument = (random: () => number, lineCount: number): string =>
  Array.from({ length: lineCount }, () => `line ${Math.floor(random() * 1000)}`).join('\n');

const mutate = (document: string, random: () => number): string => {
  const lines = document.split('\n');
  const edits = 1 + Math.floor(random() * 4);
  for (let edit = 0; edit < edits; edit++) {
    if (lines.length === 0) {
      break;
    }
    const index = Math.floor(random() * lines.length);
    const kind = random();
    if (kind < 0.4) {
      lines[index] = `line ${Math.floor(random() * 1000)}`;
    } else if (kind < 0.7) {
      lines.splice(index, 1);
    } else {
      lines.splice(index, 0, `line ${Math.floor(random() * 1000)}`);
    }
  }

  return lines.join('\n');
};
