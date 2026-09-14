//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Text } from '@dxos/schema';
import { Task, TaskSet } from '@dxos/types';

import { Lightbox } from '#types';

import { STUDIO_TASK_TITLE, STUDIO_TEMPLATE_ID, studioTemplate } from './studio.ts';

describe('studio project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('scaffolds a project owning one Lightbox filed in its artifacts', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task, Lightbox.Lightbox],
    });

    const project = await EffectEx.runPromise(
      studioTemplate
        .scaffold({ name: 'Studio' })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    expect(studioTemplate.id).toBe(STUDIO_TEMPLATE_ID);
    expect(project.name).toBe('Studio');
    expect(project.artifacts).toHaveLength(1);
    const lightbox = project.artifacts[0]?.target;
    expect(Obj.instanceOf(Lightbox.Lightbox, lightbox)).toBe(true);
    if (!lightbox) {
      return;
    }
    expect(Obj.getParent(lightbox)?.id).toBe(project.id);

    // The cascade persisted the parented lightbox alongside the project.
    const persisted = await db.query(Filter.type(Lightbox.Lightbox)).run();
    expect(persisted.map((object) => object.id)).toEqual([lightbox.id]);

    // The starter task rides the ledger's cascade, and the brief enables the studio skill.
    const tasks = await db.query(Filter.type(Task.Task)).run();
    expect(tasks.map((task) => task.title)).toEqual([STUDIO_TASK_TITLE]);
    const instructions = await project.instructions?.load();
    expect(instructions?.skills?.map((ref) => ref.uri)).toContain(Skill.registryURI('org.dxos.skill.studio'));
  });
});
