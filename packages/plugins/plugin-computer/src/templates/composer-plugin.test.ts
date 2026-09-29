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
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';
import { Text } from '@dxos/schema';
import { Task, TaskSet } from '@dxos/types';

import { composerPlugin, desktopVariant, makeComposerPlugin } from './composer-plugin.ts';

describe('Composer Plugin project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('one add persists a parent task over four chained subtasks', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task],
    });
    const project = db.add(
      await EffectEx.runPromise(
        composerPlugin.scaffold({}).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      ),
    );
    await db.flush();

    const taskSet = await project.taskSet?.load();
    if (!taskSet) {
      throw new Error('the template must give the project its task set');
    }
    expect(taskSet.tasks).toHaveLength(1);
    const parent = await taskSet.tasks[0].load();
    expect(parent.title).toBe('Build the World Clock plugin');

    const subtasks = await Promise.all((parent.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks.map((task) => task.title)).toEqual([
      'Read the plugin guide',
      'Write the plugin in TypeScript',
      'Typecheck and check the dev server',
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

  test('the desktop variant builds in a sandbox against the source tree and publishes the result', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task],
    });
    const project = db.add(
      await EffectEx.runPromise(
        makeComposerPlugin(desktopVariant('/src/dxos'))
          .scaffold({})
          .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      ),
    );
    await db.flush();

    const instructions = await project.instructions?.load();
    expect(instructions?.skills.map((skill) => skill.uri.toString())).toEqual([
      expect.stringContaining(Sandbox.SKILL_KEY),
    ]);
    const text = (await instructions?.text?.load())?.content ?? '';
    expect(text).toContain('ln -sfn /src/dxos/node_modules node_modules');

    const taskSet = await project.taskSet?.load();
    const parent = await taskSet?.tasks[0].load();
    const subtasks = await Promise.all((parent?.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks[0].description).toContain('/src/dxos/docs/src/content/docs/docs/composer/publishing-plugins.md');
    expect(subtasks[2].description).toContain('--configLoader runner plugins/world-clock');
    expect(subtasks[3].description).toContain('Publish Files');
  });
});
