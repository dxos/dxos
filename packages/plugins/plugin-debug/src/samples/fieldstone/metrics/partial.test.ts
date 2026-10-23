//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive } from '@dxos/app-toolkit/testing';
import { addressFromA1Notation, rangeFromA1Notation } from '@dxos/compute-hyperformula/types';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import type * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';
import { loadTopology } from '@dxos/react-ui-geo/data';

import { REFERENCE } from '../util.ts';
import { Partial } from './partial.ts';

type Cell = { row: number; col: number; value: unknown };

const cellsOf = (sheet: Sheet.Sheet): Cell[] =>
  Object.entries(sheet.cells).map(([index, { value }]) => ({ ...SheetUtil.addressFromIndex(sheet, index), value }));

const rowsOf = (sheet: Sheet.Sheet): unknown[][] => {
  const rows: unknown[][] = [];
  for (const { row, col, value } of cellsOf(sheet)) {
    if (row > 0) {
      (rows[row - 1] ??= [])[col] = value;
    }
  }
  return rows;
};

const leastSquaresSlope = (points: ReadonlyArray<[number, number]>): number => {
  const n = points.length;
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n;
  const covariance = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
  const variance = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  return covariance / variance;
};

const filledSeries = (rows: unknown[][]): number[][] =>
  rows.map((row) => row.flatMap((value, col) => (col > 0 && value !== undefined ? [col] : [])));

describe('Alien Labs metrics', () => {
  test('builds one charted sheet per chart type', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Alien Labs metrics' },
      reference: REFERENCE,
      partials: { metrics: Partial },
      build: (partials) => Effect.map(partials.metrics(), (metrics) => ({ metrics })),
    });
    const { result, json } = await EffectEx.runPromise(buildArchive(definition));
    const { sheets } = result.metrics;
    type ArchivedChart = Pick<Sheet.ChartProperties, 'range' | 'type' | 'regression'> & { sheet: { '/': string } };
    const archive: {
      objects: Array<
        { '@type'?: string; 'name'?: string; 'objects'?: Array<{ '/': string }> } & Partial<ArchivedChart>
      >;
    } = JSON.parse(json);

    const collection = archive.objects.find((object) => object.name === 'Metrics');
    expect(collection?.objects?.map((ref) => ref['/'].replace('echo:///', ''))).toEqual(
      Object.values(sheets).map((sheet) => sheet.id),
    );

    const charts = Object.values(sheets).map((sheet) => {
      // Charts are their own objects in the archive, each pointing back at its sheet.
      expect(sheet.charts, sheet.name).toHaveLength(1);
      const chart = archive.objects.find(
        (object) => object['@type']?.includes('org.dxos.type.chart') && object.sheet?.['/'].endsWith(sheet.id),
      );
      invariant(chart?.range && chart.type, `${sheet.name} has no chart`);
      const { from, to = from } = rangeFromA1Notation(chart.range);
      expect(from).toEqual(addressFromA1Notation('A1'));
      for (const { row, col } of cellsOf(sheet)) {
        expect(row <= to.row && col <= to.col, `${sheet.name} cell outside the chart`).toBe(true);
      }
      return chart;
    });
    expect(charts.map(({ type, regression = false }) => [type, regression])).toEqual([
      ['xy', false],
      ['scatter', false],
      ['scatter', true],
      ['heatmap', false],
      ['radar', false],
      ['map', false],
    ]);

    const hitRate = rowsOf(sheets.hitRate);
    expect(hitRate).toHaveLength(60);
    const day = (offset: number) => hitRate.find((row) => row[0] === offset) ?? [];
    expect(day(-35)[3]).toBe(0);
    expect(day(-34)[3]).toBe(0);
    expect(day(-22)[4]).toBeUndefined();
    expect(hitRate.filter((row) => Number(row[0]) < -21).every((row) => row[4] === undefined)).toBe(true);
    expect(day(-21)[4]).toBeTypeOf('number');

    const agentRuns = filledSeries(rowsOf(sheets.agentRuns));
    expect(agentRuns).toHaveLength(200);
    expect(agentRuns.every((columns) => columns.length === 1)).toBe(true);
    for (const column of [1, 2, 3, 4]) {
      expect(agentRuns.filter(([filled]) => filled === column)).toHaveLength(50);
    }

    const builds = rowsOf(sheets.buildTimes);
    expect(builds).toHaveLength(120);
    expect(filledSeries(builds).every((columns) => columns.length === 1)).toBe(true);
    const points = (column?: number): Array<[number, number]> =>
      builds.flatMap((row) =>
        row.flatMap((value, col): Array<[number, number]> =>
          col > 0 && value !== undefined && (column === undefined || col === column)
            ? [[Number(row[0]), Number(value)]]
            : [],
        ),
      );
    for (const column of [1, 2, 3]) {
      expect(points(column)).toHaveLength(40);
      expect(leastSquaresSlope(points(column))).toBeLessThan(0);
    }
    expect(leastSquaresSlope(points())).toBeGreaterThan(0);

    const heatmap = rowsOf(sheets.requestHeatmap);
    expect(heatmap).toHaveLength(7);
    expect(heatmap.every((row) => row.length === 25 && row.slice(1).every((value) => typeof value === 'number'))).toBe(
      true,
    );

    const health = rowsOf(sheets.customerHealth);
    expect(health).toHaveLength(6);
    expect(
      health.every(
        (row) => row.length === 5 && row.slice(1).every((score) => Number(score) >= 0 && Number(score) <= 10),
      ),
    ).toBe(true);

    const topology = await loadTopology('110m');
    const atlas = topology.objects.countries;
    const names = new Set(
      atlas.type === 'GeometryCollection'
        ? atlas.geometries.map(({ properties }) => (properties && 'name' in properties ? properties.name : undefined))
        : [],
    );
    const countries = rowsOf(sheets.requestsByCountry).map((row) => row[0]);
    expect(countries).toHaveLength(30);
    expect(countries.filter((name) => !names.has(name))).toEqual([]);
  });
});
