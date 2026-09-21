//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { BrambleSpace } from './index.ts';

/**
 * Bramble is built on demand rather than committed, so this asserts its shape in place of the
 * snapshot that used to carry it: if a schema a phase seeds changes incompatibly, the build fails
 * here rather than on a user's first launch.
 */
describe('Bramble sample space', () => {
  test('builds the whole roastery', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(BrambleSpace()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBe(77);

    // Contacts and the views over them.
    expect(countOf('type.organization')).toBe(6);
    expect(countOf('type.person')).toBe(9);
    expect(countOf('type.view')).toBe(5);
    expect(countOf('type.table')).toBe(2);
    expect(countOf('type.kanban')).toBe(2);
    expect(countOf('type.map')).toBe(1);

    // Mail and calendar. Messages and events live in feeds, which the histogram counts alongside
    // the archive's objects — asserting on `objects` alone misses every one of them.
    expect(countOf('type.mailbox')).toBe(1);
    expect(countOf('type.message')).toBe(41);
    expect(countOf('type.calendar')).toBe(1);
    expect(countOf('type.event')).toBe(9);
    expect(countOf('type.feed')).toBe(3);

    // Work: the Spring Blend launch, and the documents around it.
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
      const { json } = await EffectEx.runPromise(buildArchive(BrambleSpace()));
      const counts = histogram(json);

      expect(counts['dxn:org.dxos.type.schema:0.1.0']).toBe(1);
      // The roast logs themselves type off that stored schema, so their typename is an object id
      // rather than a `dxn:` typename — which is what makes them the only non-`dxn:` key here.
      const rows = Object.entries(counts).filter(([typename]) => !typename.startsWith('dxn:'));
      expect(rows).toEqual([[expect.stringMatching(/^echo:\/\//), 8]]);
    },
  );
});
