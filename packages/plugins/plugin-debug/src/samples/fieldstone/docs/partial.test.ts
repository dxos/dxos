//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive } from '@dxos/app-toolkit/testing';
import { addressFromA1Notation } from '@dxos/compute-hyperformula/types';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import type * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';

import * as Team from '../team/index.ts';
import { REFERENCE } from '../util.ts';
import { Partial } from './partial.ts';
import { type SheetKey } from './sheets.ts';

type ArchiveObject = {
  'id': string;
  '@type': string;
  'content'?: string | { '/': string };
  'canvas'?: { '/': string };
  'schema'?: string;
};

const LINK = /(!?)\[[^\]]*\]\(echo:\/\/\/([0-9A-Z]+)\)/g;

/** Every cell address in an A1 range such as `B3:C8`. */
const cellsIn = (range: string): string[] => {
  const [from, to = from] = range.split(':').map(addressFromA1Notation);
  return Array.from({ length: to.row - from.row + 1 }, (_, row) =>
    Array.from({ length: to.col - from.col + 1 }, (_, col) => ({ row: from.row + row, col: from.col + col })),
  )
    .flat()
    .map(({ row, col }) => `${String.fromCharCode(65 + col)}${row + 1}`);
};

const DERIVED: ReadonlyArray<[SheetKey, string[]]> = [
  ['pricing', ['F2:F5']],
  ['vendorSpend', ['N2:N4', 'B5:N5']],
  ['cloudCost', ['D2:D8', 'B3:C8', 'B9:D9']],
  ['incidentTimeline', ['E2:E21', 'E23']],
  ['hiring', ['E2:E6']],
];

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

describe('Alien Labs docs', () => {
  test(
    'builds linked documents, sheets and drawings without the optional partials',
    { timeout: 120_000 },
    async ({ expect }) => {
      const definition = SampleSpace.make({
        space: { name: 'Alien Labs docs' },
        reference: REFERENCE,
        partials: { team: Team.Partial, docs: Partial },
        build: (partials) =>
          Effect.gen(function* () {
            const team = yield* partials.team();
            const docs = yield* partials.docs({ team });
            return { team, docs };
          }),
      });
      const { result, json } = await EffectEx.runPromise(buildArchive(definition));
      const { docs, sheets, drawings } = result.docs;
      const archive: { objects: ArchiveObject[] } = JSON.parse(json);
      const objects = new Map(archive.objects.map((object) => [object.id, object]));
      const typeOf = (id: string) => objects.get(id)?.['@type'];
      const count = (type: string | undefined) =>
        [...objects.values()].filter((object) => object['@type'] === type).length;

      expect(Object.keys(docs)).toHaveLength(11);
      expect(Object.keys(sheets)).toHaveLength(5);
      expect(Object.keys(drawings)).toHaveLength(5);
      expect(count(typeOf(docs.handbook.id))).toBe(11);
      expect(count(typeOf(sheets.pricing.id))).toBe(5);
      expect(count(typeOf(drawings.orgChart.id))).toBe(5);
      for (const drawing of Object.values(drawings)) {
        const canvas = objects.get(drawing.id)?.canvas?.['/'].replace('echo:///', '');
        expect(canvas && typeOf(canvas)).toContain(Type.getTypename(Canvas.Canvas));
      }

      const references = Object.values(docs).map((doc) => {
        const text = objects.get(doc.id)?.content;
        const content = typeof text === 'object' ? objects.get(text['/'].replace('echo:///', ''))?.content : undefined;
        expect(typeof content).toBe('string');
        return [...String(content).matchAll(LINK)].map(([, bang, id]) => ({ embed: bang === '!', id }));
      });

      for (const refs of references) {
        expect(refs.filter((ref) => !ref.embed).length).toBeGreaterThanOrEqual(2);
      }

      const embedded = new Set(
        references
          .flat()
          .filter((ref) => ref.embed)
          .map((ref) => ref.id),
      );
      for (const object of [...Object.values(sheets), ...Object.values(drawings)]) {
        expect(embedded.has(object.id)).toBe(true);
      }
      expect(references.flat().filter((ref) => ref.embed).length).toBeGreaterThanOrEqual(12);

      // Only team and docs ran, so every target must be one of their objects.
      const present = new Set(
        [
          result.team.orgs.fieldstone,
          ...Object.values(result.team.people),
          ...Object.values(docs),
          ...Object.values(sheets),
          ...Object.values(drawings),
        ].map((object) => object.id),
      );
      for (const { id } of references.flat()) {
        expect(objects.has(id)).toBe(true);
        expect(present.has(id)).toBe(true);
      }

      for (const [key, ranges] of DERIVED) {
        const sheet = sheets[key];
        for (const cell of ranges.flatMap(cellsIn)) {
          const value = sheet.cells[SheetUtil.addressToIndex(sheet, addressFromA1Notation(cell))]?.value;
          expect(String(value), `${key}!${cell}`).toMatch(/^=/);
        }
      }

      expect(Object.values(sheets).flatMap(unstyledHeaders)).toEqual([]);
    },
  );
});
