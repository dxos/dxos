//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Text } from '@dxos/schema';
import { Task, TaskSet } from '@dxos/types';

import { makeComposerPluginTemplate } from './composer-plugin.ts';

describe('Composer Plugin (Sandbox) project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const scaffold = async (ref: string) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task],
    });
    const project = db.add(
      await EffectEx.runPromise(
        makeComposerPluginTemplate({ ref })
          .scaffold({})
          .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      ),
    );
    await db.flush();
    const taskSet = await project.taskSet?.load();
    if (!taskSet) {
      throw new Error('the template must give the project its task set');
    }
    const parent = await taskSet.tasks[0].load();
    const subtasks = await Promise.all((parent.subtasks ?? []).map((ref) => ref.load()));
    return { project, taskSet, parent, subtasks };
  };

  test('one add persists a parent task over six chained subtasks', async ({ expect }) => {
    const { project, taskSet, parent, subtasks } = await scaffold('main');
    expect(taskSet.tasks).toHaveLength(1);
    expect(parent.title).toBe('Build the World Clock plugin');
    expect(subtasks.map((task) => task.title)).toEqual([
      'Create the sandbox and install the toolchain',
      'Read the plugin guide',
      'Write the plugin in TypeScript',
      'Typecheck and build',
      'Serve and expose the plugin',
      'Offer the plugin to load',
    ]);
    expect(subtasks.every((task) => task.status === 'todo')).toBe(true);
    expect(subtasks[0].dependsOn ?? []).toHaveLength(0);
    for (const [index, task] of subtasks.entries()) {
      if (index > 0) {
        const dependencies = await Promise.all((task.dependsOn ?? []).map((ref) => ref.load()));
        expect(dependencies.map((dependency) => dependency.id)).toEqual([subtasks[index - 1].id]);
      }
    }

    const instructions = await project.instructions?.load();
    expect(instructions?.skills).toHaveLength(1);
  });

  // The host's import map serves its own copies at runtime, so the packages the build types against
  // and the guide it follows must come from the same commit.
  test('packages and guide are pinned to the host commit', async ({ expect }) => {
    const { subtasks } = await scaffold('042fcd3');
    expect(subtasks[0].description).toContain('https://pkg.pr.new/dxos/dxos/@dxos/app-framework@042fcd3');
    expect(subtasks[0].description).not.toContain('@main');
    expect(subtasks[1].description).toContain('https://raw.githubusercontent.com/dxos/dxos/042fcd3/');
  });
});
