//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Text } from '@dxos/schema';
import { TaskSet } from '@dxos/types';

import { ProjectCapabilities } from '#types';

import { defaultTemplate, defaultTemplates, scaffoldProject } from './index';

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
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet],
    });
    return db;
  };

  test('ships a Default template', ({ expect }) => {
    const found = defaultTemplates.find((template) => template.id === ProjectCapabilities.DefaultTemplateId);
    expect(found).toBe(defaultTemplate);
    expect(defaultTemplate.label).toBe('Default');
  });

  test('scaffoldProject wires the owned graph so one add cascades it', async ({ expect }) => {
    const db = await createDatabase();
    const project = db.add(scaffoldProject({ name: 'Test' }));
    await db.flush();

    const instructions = await project.instructions?.tryLoad();
    const taskSet = await project.taskSet?.tryLoad();
    expect(instructions).toBeDefined();
    expect(taskSet).toBeDefined();
    expect(Obj.getParent(instructions!)?.id).toBe(project.id);
    expect(Obj.getParent(taskSet!)?.id).toBe(project.id);
    // Artifacts start empty and are appended as the project produces them.
    expect(project.artifacts).toEqual([]);

    // Deletion cascades back through the same parent edges.
    db.remove(project);
    await db.flush();
    expect((await db.query(Filter.type(Instructions.Instructions)).run()).length).toBe(0);
    expect((await db.query(Filter.type(TaskSet.TaskSet)).run()).length).toBe(0);
  });

  test('default template seeds a creation subject as standing context', async ({ expect }) => {
    const db = await createDatabase();
    const subject = db.add(Obj.make(Text.Text, { content: 'subject' }));
    const project = await EffectEx.runPromise(
      defaultTemplate
        .scaffold({ name: 'Scoped', subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref: Ref.Ref<Obj.Unknown>) => ref.target?.id)).toEqual([subject.id]);
  });
});
