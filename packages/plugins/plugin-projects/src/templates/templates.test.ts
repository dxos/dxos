//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Instructions, Project } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Text } from '@dxos/schema';

import { ProjectCapabilities } from '#types';

import { blank, defaultTemplates, scaffoldProject } from './index';

describe('project templates', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createDatabase = async () => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Collection.Collection, Text.Text],
    });
    return db;
  };

  test('ships a Blank template', ({ expect }) => {
    const found = defaultTemplates.find((template) => template.id === ProjectCapabilities.BlankTemplateId);
    expect(found).toBe(blank);
    expect(blank.label).toBe('Blank');
  });

  test('scaffoldProject wires the owned graph so one add cascades it', async ({ expect }) => {
    const db = await createDatabase();
    const project = db.add(scaffoldProject({ name: 'Test' }));
    await db.flush();

    const instructions = await project.instructions?.tryLoad();
    const artifacts = await project.artifacts?.tryLoad();
    expect(instructions).toBeDefined();
    expect(artifacts).toBeDefined();
    expect(Obj.getParent(instructions!)?.id).toBe(project.id);
    expect(Obj.getParent(artifacts!)?.id).toBe(project.id);

    // Deletion cascades back through the same parent edges.
    db.remove(project);
    await db.flush();
    expect((await db.query(Filter.type(Instructions.Instructions)).run()).length).toBe(0);
    expect((await db.query(Filter.type(Collection.Collection)).run()).length).toBe(0);
  });

  test('blank template seeds a creation subject as standing context', async ({ expect }) => {
    const db = await createDatabase();
    const subject = db.add(Obj.make(Text.Text, { content: 'subject' }));
    const project = await EffectEx.runPromise(
      blank
        .scaffold({ name: 'Scoped', subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref: Ref.Ref<Obj.Unknown>) => ref.target?.id)).toEqual([subject.id]);
  });
});
