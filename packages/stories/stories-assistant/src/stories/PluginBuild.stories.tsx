//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ComposerPluginTemplate from '@dxos/plugin-dev-shell/ComposerPluginTemplate';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as Templates from '@dxos/plugin-projects/Templates';
import { Task, TaskSet } from '@dxos/types';

import { ThreadColumns } from '../components/index.ts';
import { BUILD_PROMPT, PLUGIN_SIDE_QUESTION, Scripts, WORLD_CLOCK_KEY } from '../scripts/index.ts';
import { createDecorators, storyParameters } from '../testing/index.ts';

/**
 * An agent builds a real Composer plugin on this machine through three subagents, each in a column of its own: one
 * writes the plan, then one draws the architecture while another writes the code. The space holds the Composer Plugin project made from Dev
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
    const [{ Drawing }, DevShellPlugin, IllustratorPlugin, ProjectsPlugin, TasksPlugin, TldrawPlugin] =
      await Promise.all([
        import('@dxos/plugin-illustrator'),
        import('@dxos/plugin-dev-shell/DevShellPlugin'),
        import('@dxos/plugin-illustrator/IllustratorPlugin'),
        import('@dxos/plugin-projects/ProjectsPlugin'),
        import('@dxos/plugin-tasks/TasksPlugin'),
        import('@dxos/plugin-tldraw/TldrawPlugin'),
      ]);
    return {
      // Tasks is declared in Projects' `dependsOn`, so the manager refuses to resolve it alone; tldraw is the canvas
      // the diagram subagent's drawing is made on.
      plugins: [
        TasksPlugin.make(),
        ProjectsPlugin.make(),
        DevShellPlugin.make(),
        IllustratorPlugin.make(),
        TldrawPlugin.make(),
      ],
      types: [Project.Project, TaskSet.TaskSet, Task.Task, Drawing.Drawing, Drawing.Canvas],
    };
  },
  skills: [PlanningSkill.key, MarkdownSkill.key, DrawingSkill.key, ComposerPluginTemplate.variant.skill],
  scriptedModels: { scenes: { buildPlugin: Scripts.buildPlugin }, select: 'buildPlugin' },
  onChatCreated: seedProject,
  assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
});

const SUGGESTIONS = [BUILD_PROMPT, PLUGIN_SIDE_QUESTION];

/** Waits until exactly `count` subagent and agent columns are open. */
const waitForColumns = (canvasElement: HTMLElement, count: number, timeout: number) =>
  waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(count), {
    timeout,
  });

/** Clicks "Build." itself and waits for the plugin to be offered: the end-to-end check. */
export const Default: StoryObj = {
  render: () => <ThreadColumns suggestions={SUGGESTIONS} />,
  decorators,
  // Writes and runs on the machine serving storybook, so it runs only where that is asked for.
  tags: ['manual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: BUILD_PROMPT }, { timeout: 60_000 }));

    // The planner's column opens first; the diagram's and the code's open together once it reports.
    await waitForColumns(canvasElement, 2, 60_000);
    await waitForColumns(canvasElement, 3, 120_000);

    // Every column closes once its subagent reports, and the agent offers the plugin with the plan and the diagram.
    await canvas.findAllByText(/World Clock is ready/, {}, { timeout: 300_000 });
    await waitForColumns(canvasElement, 1, 60_000);
  },
};

/** {@link Default} without its play function: the run starts when you click "Build.". */
export const Manual: StoryObj = {
  render: () => <ThreadColumns suggestions={SUGGESTIONS} />,
  decorators,
  // Not a test: nothing happens until someone clicks.
  tags: ['!test'],
};
