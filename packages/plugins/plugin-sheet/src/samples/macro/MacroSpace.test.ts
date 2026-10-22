//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Sheet } from '#types';

import * as MacroSpace from './MacroSpace.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('Macro template', () => {
  test('builds the events sheet, its timeline chart and the deck', { timeout: 120_000 }, async ({ expect }) => {
    const definition = MacroSpace.make();
    const { db } = await builder.createDatabase({ types: [...definition.schemas] });
    const properties = db.add(Obj.make(Collection.Collection, { objects: [] }));
    await EffectEx.runPromise(SampleSpace.applyTo(definition, { db, properties }));
    await db.flush();

    const [sheet]: Sheet.Sheet[] = await db.query(Filter.type(Sheet.Sheet)).run();
    expect(sheet.name).toBe('Macro events');

    const charts: Sheet.Chart[] = await db.query(Filter.type(Sheet.Chart)).run();
    expect(charts).toHaveLength(1);
    const [chart] = charts;
    expect(chart.type).toBe('timeline');
    expect(chart.sheet.target?.id).toBe(sheet.id);
    expect(Obj.getParent(chart)?.id).toBe(sheet.id);

    const [deck]: Markdown.Document[] = await db.query(Filter.type(Markdown.Document)).run();
    const content = (await deck.content.load()).content;
    expect(content).toContain('| Financial (FIC) | Liquidity and debt |');
    expect(content.split('\n---\n')).toHaveLength(2);
    expect(content).toContain(`(echo:///${chart.id})`);
  });
});
