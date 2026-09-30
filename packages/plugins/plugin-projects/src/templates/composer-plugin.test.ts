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

import { composerPlugin, desktopVariant, makeComposerPlugin } from './composer-plugin.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

const TOOLCHAIN = {
  commit: COMMIT,
  versions: {
    'effect': '4.0.0',
    'react': '19.2.8',
    'react-dom': '19.2.8',
    '@types/react': '19.2.18',
    '@vitejs/plugin-react': '6.0.5',
    'typescript': '7.0.2',
    'vite': '8.3.1',
  },
};

describe('Composer Plugin project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const scaffold = async () => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task],
    });
    const project = db.add(
      await EffectEx.runPromise(
        makeComposerPlugin(desktopVariant(TOOLCHAIN))
          .scaffold({})
          .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      ),
    );
    await db.flush();
    return project;
  };

  test('one add persists a parent task over four chained subtasks', async ({ expect }) => {
    const project = await scaffold();
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
      'Install, typecheck and build',
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
  });

  test('builds in a sandbox from public sources pinned to the commit the app was built from', async ({ expect }) => {
    const project = await scaffold();
    const instructions = await project.instructions?.load();
    expect(instructions?.skills.map((skill) => skill.uri.toString())).toEqual([
      expect.stringContaining('org.dxos.skill.sandbox'),
    ]);
    const text = (await instructions?.text?.load())?.content ?? '';
    expect(text).toContain('nothing but `bun` and `bunx`');
    expect(text).not.toMatch(/node_modules|ln -s/);

    const taskSet = await project.taskSet?.load();
    const parent = await taskSet?.tasks[0].load();
    const subtasks = await Promise.all((parent?.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks[0].description).toContain(`https://raw.githubusercontent.com/dxos/dxos/${COMMIT}/docs/`);
    expect(subtasks[1].description).toContain(
      `"@dxos/app-framework": "https://pkg.pr.new/@dxos/app-framework@${COMMIT}"`,
    );
    expect(subtasks[1].description).toContain('"react": "19.2.8"');
    expect(subtasks[2].description).toContain('bunx @pnpm/exe@10 install');
    expect(subtasks[3].description).toContain('Publish Files');
  });

  test('is not offered outside the desktop app', ({ expect }) => {
    expect(composerPlugin()).toBeUndefined();
  });
});
