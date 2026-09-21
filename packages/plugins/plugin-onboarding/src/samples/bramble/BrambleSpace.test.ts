//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import * as BrambleSpace from './BrambleSpace.ts';

/** Asserts the built archive's shape, so an incompatible schema change fails here. */
describe('Bramble template', () => {
  test('builds the whole roastery', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(BrambleSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBe(77);

    expect(countOf('type.organization')).toBe(6);
    expect(countOf('type.person')).toBe(9);
    expect(countOf('type.view')).toBe(5);
    expect(countOf('type.table')).toBe(2);
    expect(countOf('type.kanban')).toBe(2);
    expect(countOf('type.map')).toBe(1);

    expect(countOf('type.mailbox')).toBe(1);
    expect(countOf('type.message')).toBe(41);
    expect(countOf('type.calendar')).toBe(1);
    expect(countOf('type.event')).toBe(9);
    expect(countOf('type.feed')).toBe(3);

    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(6);
    expect(countOf('type.milestone')).toBe(2);
    expect(countOf('type.document')).toBe(5);
    expect(countOf('type.drawing')).toBe(2);
    expect(countOf('type.sheet')).toBe(2);
    expect(countOf('type.collection')).toBe(4);
  });

  test(
    'persists the roast log as a space-local schema with rows behind it',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await EffectEx.runPromise(buildArchive(BrambleSpace.make()));
      const counts = histogram(json);

      expect(counts['dxn:org.dxos.type.schema:0.1.0']).toBe(1);
      const rows = Object.entries(counts).filter(([typename]) => !typename.startsWith('dxn:'));
      expect(rows).toEqual([[expect.stringMatching(/^echo:\/\//), 8]]);
    },
  );
});
