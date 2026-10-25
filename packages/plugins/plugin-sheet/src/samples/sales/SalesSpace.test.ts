//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Sheet } from '#types';

import * as SalesSpace from './SalesSpace.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('Sales template', () => {
  test('builds the sales sheet and its two charts', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SalesSpace.make();
    const { db } = await builder.createDatabase({ types: [...definition.schemas] });
    const properties = db.add(Obj.make(Collection.Collection, { objects: [] }));
    await EffectEx.runPromise(SampleSpace.applyTo(definition, { db, properties }));
    await db.flush();

    const [sheet]: Sheet.Sheet[] = await db.query(Filter.type(Sheet.Sheet)).run();
    expect(sheet.name).toBe('Sales');
    const charts: Sheet.Chart[] = await db.query(Filter.type(Sheet.Chart)).run();
    expect(charts.map((chart) => chart.type).sort()).toEqual(['bar', 'pie']);
    expect(charts.every((chart) => Obj.getParent(chart)?.id === sheet.id)).toBe(true);
  });
});
