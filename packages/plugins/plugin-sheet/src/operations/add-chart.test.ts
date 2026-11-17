//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Sheet } from '#types';

import addChart from './add-chart.ts';

describe('AddChart', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('adds a chart of the range, owned by the sheet', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Sheet.Sheet, Sheet.Chart]);
    const sheet = db.add(
      Sheet.make({
        name: 'Products',
        cells: { A1: { value: 'Product' }, B1: { value: 'Mentions' }, A2: { value: 'D1' }, B2: { value: 225 } },
      }),
    );

    const { id } = await addChart
      .handler({ sheet: Ref.make(sheet), range: 'A1:B2', type: 'bar', name: 'Mentions', header: true })
      .pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    expect(sheet.charts).toHaveLength(1);
    const chart = sheet.charts?.[0]?.target;
    if (!chart) {
      throw new Error('No chart was added.');
    }
    expect(id).toBe(Obj.getURI(chart).toString());
    expect(chart.range).toBe('A1:B2');
    expect(chart.type).toBe('bar');
    expect(chart.header).toBe(true);
  });

  test('refuses a range that is not in A1 notation', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Sheet.Sheet, Sheet.Chart]);
    const sheet = db.add(Sheet.make({ name: 'Empty' }));

    await expect(
      addChart
        .handler({ sheet: Ref.make(sheet), range: 'products', type: 'bar' })
        .pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors),
    ).rejects.toThrow('Not a range in A1 notation');
    expect(sheet.charts ?? []).toHaveLength(0);
  });
});
