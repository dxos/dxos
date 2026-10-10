//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import * as ArchitectureSpace from './ArchitectureSpace.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('ArchitectureSpace', () => {
  test('seeds every diagram as a drawing and lists the Composer and EDGE overviews', async ({ expect }) => {
    const definition = ArchitectureSpace.make();
    const { db } = await builder.createDatabase({ types: [...definition.schemas] });
    // The root collection is annotated onto whatever object stands for the space's properties.
    const properties = db.add(Obj.make(Collection.Collection, { objects: [] }));
    await EffectEx.runPromise(SampleSpace.applyTo(definition, { db, properties }));

    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings).toHaveLength(12);
    const collections = await db.query(Filter.type(Collection.Collection)).run();
    const listed = collections.find((collection) => collection.name === 'Architecture');
    const names = await Promise.all((listed?.objects ?? []).map(async (ref) => Obj.getLabel(await ref.load())));
    expect(names).toEqual(['Composer', 'EDGE']);
  });
});
