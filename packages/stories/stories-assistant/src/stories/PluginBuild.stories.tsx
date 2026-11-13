//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { userEvent, within } from 'storybook/test';

import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ComposerPluginTemplate from '@dxos/plugin-dev-shell/ComposerPluginTemplate';
import * as Templates from '@dxos/plugin-projects/Templates';
import { Task, TaskSet } from '@dxos/types';

import { ThreadColumns } from '../components/index.ts';
import { BUILD_PROMPT, Scripts, WORLD_CLOCK_KEY } from '../scripts/index.ts';
import { createDecorators, storyParameters } from '../testing/index.ts';

/**
 * An agent builds a real Composer plugin on this machine. The space holds the Composer Plugin project made from Dev
 * Shell's template, its parent task and four subtasks already on the chat's checklist; one chip, "Build.", starts the
 * run. The `buildPlugin` scripted model decides each step, and Dev Shell's harness carries it out for real: the plugin is
 * written to `temp/plugins/world-clock` under the Composer app, typechecked and checked against its dev server.
 *
 * Needs storybook's dev server, which mounts the Dev Shell route, and for the dev-server check the plugin's own server:
 * `node_modules/.bin/vite temp/plugins/world-clock` from `packages/apps/composer-app`. Load the result in Composer
 * from Plugins → Dev Server.
 */
const meta: Meta = {
  title: 'stories/stories-assistant/PluginBuild',
  parameters: storyParameters,
};

export default meta;

/** The template as Dev Shell contributes it, but with the plugin key the scripted source declares. */
const template = Templates.makeComposerPlugin(ComposerPluginTemplate.variant, () => WORLD_CLOCK_KEY);

/** Seeds the project and puts its whole task tree on the chat's checklist, as delegating the parent task would. */
const seedProject = async ({
  db,
  chat,
  binder,
}: {
  db: Database.Database;
  chat: AssistantChat.Chat;
  binder: { bind: (props: { objects: Ref.Ref<Project.Project>[] }) => Promise<void> };
}) => {
  const project = await EffectEx.runPromise(
    template.scaffold({ name: 'World Clock' }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
  );
  db.add(project);
  const taskSet = await project.taskSet?.load();
  const parent = taskSet && (await taskSet.tasks[0]?.load());
  if (!parent) {
    throw new Error('The Composer Plugin template seeded no parent task.');
  }
  AssistantChat.assignTasks(chat, [Ref.make(parent), ...(parent.subtasks ?? [])]);
  await binder.bind({ objects: [Ref.make(project)] });
  await db.flush();
};

const decorators = createDecorators({
  lazyPlugins: async () => {
    const [DevShellPlugin, ProjectsPlugin, TasksPlugin] = await Promise.all([
      import('@dxos/plugin-dev-shell/DevShellPlugin'),
      import('@dxos/plugin-projects/ProjectsPlugin'),
      import('@dxos/plugin-tasks/TasksPlugin'),
    ]);
    return {
      // Tasks is declared in Projects' `dependsOn`, so the manager refuses to resolve it alone.
      plugins: [TasksPlugin.make(), ProjectsPlugin.make(), DevShellPlugin.make()],
      types: [Project.Project, TaskSet.TaskSet, Task.Task],
    };
  },
  skills: [PlanningSkill.key, ComposerPluginTemplate.variant.skill],
  scriptedModels: { scenes: { buildPlugin: Scripts.buildPlugin }, select: 'buildPlugin' },
  onChatCreated: seedProject,
});

/** Clicks "Build." itself and waits for the plugin to be offered: the end-to-end check. */
export const Default: StoryObj = {
  render: () => <ThreadColumns suggestions={[BUILD_PROMPT]} />,
  decorators,
  // Writes and runs on the machine serving storybook, so it runs only where that is asked for.
  tags: ['manual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: BUILD_PROMPT }, { timeout: 60_000 }));
    await canvas.findAllByText(/World Clock is ready/, {}, { timeout: 300_000 });
  },
};

/** {@link Default} without its play function: the run starts when you click "Build.". */
export const Manual: StoryObj = {
  render: () => <ThreadColumns suggestions={[BUILD_PROMPT]} />,
  decorators,
  // Not a test: nothing happens until someone clicks.
  tags: ['!test'],
};
