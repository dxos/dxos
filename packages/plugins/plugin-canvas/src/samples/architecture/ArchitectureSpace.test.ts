//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import * as ArchitectureSpace from './ArchitectureSpace.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('ArchitectureSpace', () => {
  test('seeds every diagram, and Composer, DXOS and EDGE documents that link and embed them', async ({ expect }) => {
    const definition = ArchitectureSpace.make();
    const { db } = await builder.createDatabase({ types: [...definition.schemas] });
    // The root collection is annotated onto whatever object stands for the space's properties.
    const properties = db.add(Obj.make(Collection.Collection, { objects: [] }));
    await EffectEx.runPromise(SampleSpace.applyTo(definition, { db, properties }));

    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings).toHaveLength(12);
    const collections = await db.query(Filter.type(Collection.Collection)).run();
    const listed = collections.find((collection) => collection.name === 'Architecture');
    const listedObjects = await Promise.all((listed?.objects ?? []).map((ref) => ref.load()));
    expect(listedObjects.map((object) => Obj.getLabel(object))).toEqual([
      'Composer',
      'DXOS',
      'EDGE',
      'Composer',
      'EDGE',
    ]);

    // The root document links the other two by id and embeds the Composer drawing.
    const docs = await db.query(Filter.type(Markdown.Document)).run();
    const byName = (name: string) => docs.find((doc) => doc.name === name);
    const [composer, dxos, edge] = ['Composer', 'DXOS', 'EDGE'].map(byName);
    const content = (await composer?.content.load())?.content ?? '';
    const composerDrawing = drawings.find((drawing) => drawing.name === 'Composer');
    expect(content).toContain(`[DXOS](echo:///${dxos?.id})`);
    expect(content).toContain(`[EDGE](echo:///${edge?.id})`);
    expect(content).toContain(`![Composer architecture](echo:///${composerDrawing?.id})`);
  });
});
