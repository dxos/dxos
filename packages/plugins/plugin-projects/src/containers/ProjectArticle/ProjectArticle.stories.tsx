//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectArticle } from './ProjectArticle';

const PROJECT_NAME = 'Project 1';
const TASK_TITLE = 'Ship the tasks section';
const ARTIFACT_TITLE = 'Design Notes';

/**
 * Seed a project with the same owned-object graph the create-object capability builds: an owned
 * Instructions document and task set, plus one referenced (non-owned) artifact.
 */
const seedProject = (space: Space) => {
  const project = Project.make({ name: PROJECT_NAME, description: 'Track the plugin-projects milestone.' });
  const instructions = Instructions.make({ text: 'You are an assistant focused on this project.' });
  Obj.setParent(instructions, project);
  const taskSet = TaskSet.make({ name: 'Tasks' });
  Obj.setParent(taskSet, project);
  const artifact = space.db.add(Text.make({ name: ARTIFACT_TITLE, content: 'Notes.' }));
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = [Ref.make(artifact)];
    project.taskSet = Ref.make(taskSet);
  });

  space.db.add(project);

  // Added after the cascade so the task lands in the persisted task set; membership is the set's
  // `tasks` array, with the parent edge alongside for deletion cascade.
  const task = space.db.add(Task.make({ title: TASK_TITLE, status: 'todo' }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(task)];
  });
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return <ProjectArticle role='article' subject={project} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        TasksPlugin.make(),
        ClientPlugin.make({
          types: [Project.Project, Instructions.Instructions, Skill.Skill, Text.Text, TaskSet.TaskSet, Task.Task],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seedProject(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [
      ...translations,
      ...reactUiTranslations,
      ...formTranslations,
      ...routineTranslations,
      ...tasksTranslations,
    ],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Header form: the project name renders as the editable name field's value. Identity/space
    // setup runs async, so allow more than testing-library's default 1s timeout.
    await expect(canvas.findByDisplayValue(PROJECT_NAME, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Instructions: the owned Instructions markdown editor mounts.
    await waitFor(() => expect(canvasElement.querySelector('.cm-editor')).toBeTruthy(), { timeout: 10_000 });

    // Artifacts: the section heading renders, and the seeded artifact's label resolves.
    await expect(canvas.findByText('Artifacts', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(ARTIFACT_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Tasks: the section heading renders AND plugin-tasks' TaskSet section surface resolves into it.
    // The task title is the load-bearing assertion — an invalid surface id is dropped silently, so
    // the heading alone renders over an empty section.
    await expect(canvas.findByText('Tasks', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
