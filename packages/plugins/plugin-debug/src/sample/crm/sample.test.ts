//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { PipelineSpace } from './index.ts';

/**
 * The CRM sample space is built on demand rather than committed, so this asserts its shape in place
 * of a fixture: if a schema it seeds changes incompatibly, the build fails here.
 */
describe('Northwind Sales sample space', () => {
  test('builds an archive with the board, the accounts and the mail', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(PipelineSpace()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.organization')).toBe(7);
    expect(countOf('type.person')).toBe(7);
    expect(countOf('type.pipeline')).toBe(1);
    expect(countOf('type.mailbox')).toBe(1);
    // Eight emails, in the mailbox's feed rather than the database.
    expect(countOf('type.message')).toBe(8);
    // One view per pipeline stage.
    expect(countOf('type.view')).toBe(5);
  });

  // Same budget as above: this also boots a client and builds the whole space, which a shared CI
  // runner with coverage instrumentation does not finish inside the 15s default.
  test('backs every pipeline column with a stage-filtered view', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(PipelineSpace()));
    const objects: Array<{ '@type'?: string; 'columns'?: Array<{ name: string; order: string[] }> }> =
      JSON.parse(json).objects;

    const pipeline = objects.find((object) => object['@type']?.includes('type.pipeline'));
    const columns = pipeline?.columns ?? [];
    expect(columns.map((column) => column.name)).toEqual([
      'Prospect',
      'Qualified',
      'Commit',
      'Closed won',
      'Closed lost',
    ]);
    // Two accounts sit at commit, two closed won, one at each of the rest.
    expect(columns.map((column) => column.order.length)).toEqual([1, 1, 2, 2, 1]);
  });
});
