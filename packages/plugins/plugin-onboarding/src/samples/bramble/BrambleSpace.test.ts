//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import type * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';

import * as BrambleSpace from './BrambleSpace.ts';
import { Sheets } from './sheets.ts';
import { REFERENCE } from './util.ts';

/** Header cells (row 1 labels) missing the heading style, or over all-numeric values without end alignment. */
const unstyledHeaders = (sheet: Sheet.Sheet): string[] => {
  const ranges = sheet.ranges.map(({ range, key, value }) => ({
    ...SheetUtil.rangeFromIndex(sheet, range),
    key,
    value,
  }));
  const covered = (key: string, value: string, { col, row }: { col: number; row: number }) =>
    ranges.some(
      (range) =>
        range.key === key &&
        range.value === value &&
        col >= range.from.col &&
        col <= range.to.col &&
        row >= range.from.row &&
        row <= range.to.row,
    );
  const cells = Object.entries(sheet.cells).map(([index, { value }]) => ({
    ...SheetUtil.addressFromIndex(sheet, index),
    value,
  }));
  return cells
    .filter(({ row, value }) => row === 0 && typeof value === 'string' && !value.startsWith('='))
    .flatMap((header) => {
      const column = cells.filter(({ col, row }) => col === header.col && row > 0);
      const numeric =
        column.length > 0 && column.every(({ value }) => typeof value === 'number' || String(value).startsWith('='));
      return [
        ...(covered('style', 'header', header) ? [] : [`${sheet.name}: ${header.value} has no heading style`]),
        ...(numeric && !covered('alignment', 'end', header)
          ? [`${sheet.name}: ${header.value} is not end-aligned`]
          : []),
      ];
    });
};

/** Asserts the built archive's shape, so an incompatible schema change fails here. */
describe('Bramble template', () => {
  test('builds the whole roastery', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(BrambleSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBe(131);

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

    expect(countOf('type.project:')).toBe(4);
    expect(countOf('type.instructions')).toBe(5);
    expect(countOf('type.outline')).toBe(4);
    expect(countOf('type.routine')).toBe(1);
    expect(countOf('type.trigger')).toBe(1);
    expect(countOf('type.taskSet')).toBe(4);
    expect(countOf('type.task:')).toBe(23);
    expect(countOf('type.milestone')).toBe(5);
    expect(countOf('type.document')).toBe(7);
    expect(countOf('type.drawing')).toBe(2);
    expect(countOf('type.sheet')).toBe(3);
    expect(countOf('type.chart')).toBe(2);
    expect(countOf('type.collection')).toBe(4);
  });

  test('styles every sheet header and end-aligns its numeric columns', async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Bramble sheets' },
      reference: REFERENCE,
      partials: { sheets: Sheets },
      build: (partials) => partials.sheets(),
    });
    const { result } = await EffectEx.runPromise(buildArchive(definition));
    expect(Object.values(result).flatMap(unstyledHeaders)).toEqual([]);
  });

  test('shares documents between collections and projects', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(BrambleSpace.make()));
    type Ref = { '/': string };
    type Entry = {
      'id': string;
      '@type'?: string;
      '@parent'?: string;
      'name'?: string;
      'objects'?: Ref[];
      'artifacts'?: Ref[];
    };
    const { objects = [] }: { objects?: Entry[] } = JSON.parse(json);
    const find = (type: string, name: string) =>
      objects.find((object) => object['@type']?.includes(type) && object.name === name);
    const uri = (entry: Entry | undefined) => `echo:///${entry?.id}`;
    const refs = (list: Ref[] | undefined) => (list ?? []).map((ref) => ref['/']);

    // Owned by a collection, listed by a project.
    const wholesaleTerms = find('type.document', 'Wholesale terms');
    expect(wholesaleTerms).toBeDefined();
    expect(wholesaleTerms?.['@parent']).toBe(uri(find('type.collection', 'Reference')));
    expect(refs(find('type.project', 'Olive & Vine Onboarding')?.artifacts)).toContain(uri(wholesaleTerms));

    // Owned by a project, listed by a collection.
    const floorPlan = find('type.drawing', 'Roastery floor plan');
    expect(floorPlan).toBeDefined();
    expect(floorPlan?.['@parent']).toBe(uri(find('type.project', 'Roastery Ops')));
    expect(refs(find('type.collection', 'Roastery Handbook')?.objects)).toContain(uri(floorPlan));
  });

  test('ships its routine disabled', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(BrambleSpace.make()));
    const { objects = [] }: { objects?: Array<{ '@type'?: string; 'enabled'?: boolean }> } = JSON.parse(json);
    const triggers = objects.filter((object) => object['@type']?.includes('type.trigger'));

    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers.every((trigger) => trigger.enabled === false)).toBe(true);
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
