//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { LegacySheet, Sheet } from '#types';

import { sheetCharts } from './migrations.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const setup = async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([LegacySheet.LegacySheet, Sheet.Sheet, Sheet.Chart]);
  return db;
};

/** A sheet as stored before charts became their own objects. */
const addLegacySheet = (db: Database.Database, charts?: LegacySheet.LegacyChart[]) =>
  db.add(
    Obj.make(LegacySheet.LegacySheet, {
      name: 'Events',
      cells: { 'a@b': { value: 1 } },
      rows: ['a'],
      columns: ['b'],
      rowMeta: {},
      columnMeta: {},
      ranges: [],
      ...(charts && { charts }),
    }),
  );

describe('sheet charts', () => {
  test('a chart is its own object, owned by its sheet', async ({ expect }) => {
    const db = await setup();
    const sheet = db.add(Sheet.make({ name: 'Sales' }));
    const chart = Sheet.addChart(sheet, { range: 'A1:B5', type: 'bar', timeline: { hidden: ['A'] } });
    await db.flush();

    expect(Obj.getDatabase(chart)).toBe(db);
    expect(Obj.getParent(chart)?.id).toBe(sheet.id);
    expect(chart.sheet.target?.id).toBe(sheet.id);
    expect(sheet.charts?.map((ref) => ref.target?.id)).toEqual([chart.id]);

    Sheet.updateChart(chart, { name: 'Sales', type: 'pie' });
    expect(chart.name).toBe('Sales');
    expect(chart.type).toBe('pie');

    Sheet.removeChart(sheet, chart);
    await db.flush();
    expect(sheet.charts).toEqual([]);
    expect(await db.query(Filter.type(Sheet.Chart)).run()).toHaveLength(0);
  });

  test('a sheet made with charts adds them to the database with it', async ({ expect }) => {
    const db = await setup();
    const sheet = db.add(Sheet.make({ charts: [{ range: 'A1:B5', type: 'bar' }] }));
    await db.flush();

    const charts: Sheet.Chart[] = await db.query(Filter.type(Sheet.Chart)).run();
    expect(charts).toHaveLength(1);
    expect(Obj.getParent(charts[0])?.id).toBe(sheet.id);
    expect(charts[0].sheet.target?.id).toBe(sheet.id);
  });

  test('the migration turns inline charts into chart objects', async ({ expect }) => {
    const db = await setup();
    const legacy = addLegacySheet(db, [
      { id: 'one', name: 'Sales', range: 'A1:C7', type: 'bar', header: true },
      { id: 'two', range: 'A1:E9', type: 'timeline', timeline: { spine: 'left', hidden: ['Macro'] } },
    ]);
    const sheetId = legacy.id;
    await db.flush();

    await db.runMigrations([sheetCharts]);

    const [sheet]: Sheet.Sheet[] = await db.query(Filter.type(Sheet.Sheet)).run();
    expect(sheet.id).toBe(sheetId);
    expect(sheet.cells).toEqual({ 'a@b': { value: 1 } });
    const charts: Sheet.Chart[] = await db.query(Filter.type(Sheet.Chart)).run();
    expect(charts).toHaveLength(2);
    expect(sheet.charts?.map((ref) => ref.target?.name ?? ref.target?.range)).toEqual(['Sales', 'A1:E9']);
    const timeline = charts.find((chart) => chart.type === 'timeline');
    expect(timeline?.timeline).toEqual({ spine: 'left', hidden: ['Macro'] });
    expect(timeline?.sheet.target?.id).toBe(sheetId);
    expect(timeline && Obj.getParent(timeline)?.id).toBe(sheetId);
  });

  test('the migration carries a sheet with no charts', async ({ expect }) => {
    const db = await setup();
    addLegacySheet(db);
    await db.flush();

    await db.runMigrations([sheetCharts]);

    const [sheet]: Sheet.Sheet[] = await db.query(Filter.type(Sheet.Sheet)).run();
    expect(sheet.charts).toBeUndefined();
    expect(await db.query(Filter.type(LegacySheet.LegacySheet)).run()).toHaveLength(0);
  });
});
