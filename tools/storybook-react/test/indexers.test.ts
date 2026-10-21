//
// Copyright 2026 DXOS.org
//

import { type Indexer, type IndexerOptions, type IndexInput } from 'storybook/internal/types';
import { describe, test } from 'vitest';

import { withRetry } from '../.storybook/indexers.ts';

const entry: IndexInput = { type: 'story', importPath: './a.stories.tsx', exportName: 'Default', title: 'a' };

/** An indexer that fails its first `failures` calls, as a read of a half-written file does. */
const flaky = (failures: number) => {
  let calls = 0;
  const indexer: Indexer = {
    test: /\.stories\.tsx$/,
    createIndex: async () => {
      calls++;
      if (calls <= failures) {
        throw new Error('Could not parse import/exports with acorn');
      }
      return [entry];
    },
  };
  return { indexer, calls: () => calls };
};

const options: IndexerOptions = { makeTitle: (title) => title ?? '' };
const noSleep = async () => {};

describe('withRetry', () => {
  test('a file that parses on a later read is indexed', async ({ expect }) => {
    const { indexer, calls } = flaky(2);
    const result = await withRetry(indexer, { sleep: noSleep }).createIndex('a.stories.tsx', options);
    expect(result).toEqual([entry]);
    expect(calls()).toBe(3);
  });

  test('a file that keeps failing fails the index unless skipped', async ({ expect }) => {
    const { indexer } = flaky(10);
    await expect(withRetry(indexer, { sleep: noSleep }).createIndex('a.stories.tsx', options)).rejects.toThrow('acorn');

    const warnings: string[] = [];
    const skipping = withRetry(flaky(10).indexer, {
      sleep: noSleep,
      skipOnFailure: true,
      warn: (message) => warnings.push(message),
    });
    expect(await skipping.createIndex('a.stories.tsx', options)).toEqual([]);
    expect(warnings[0]).toContain('a.stories.tsx left out of the story index');
  });
});
