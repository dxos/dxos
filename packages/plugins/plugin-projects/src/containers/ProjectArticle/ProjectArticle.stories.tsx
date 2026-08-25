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
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectArticle } from './ProjectArticle';

const PROJECT_NAME = 'Project 1';
const TASK_TITLE = 'Ship the tasks section';
const ARTIFACT_TITLE = 'Design Notes';
const MILESTONE_NAME = 'Beta';
const OUTLINE_ITEM = 'Draft the launch checklist';

/**
 * The seeded graph, kept so a play function can mutate the source objects and assert the article
 * re-renders. The article is fed a live subject by the surface, so proving that a change to a
 * *referenced* object (a task's title, a new member of `taskSet.tasks`, a new artifact ref) reaches
 * the DOM is the only way to catch a section that resolved once and then went inert.
 */
let seeded: { space: Space; project: Project.Project; taskSet: TaskSet.TaskSet } | undefined;

/**
 * Seed a project with the same owned-object graph the create-object capability builds: an owned
 * Instructions document and task set, plus one referenced (non-owned) artifact.
 */
const seedProject = (space: Space) => {
  const project = Project.make({ name: PROJECT_NAME, description: 'Track the plugin-projects milestone.' });
  const instructions = Instructions.make({ text: 'You are an assistant focused on this project.' });
  // `Project.make` materializes the owned task set, so the seed uses that one rather than
  // substituting its own — swapping it would leave the project's own set orphaned.
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  const artifact = space.db.add(Text.make({ name: ARTIFACT_TITLE, content: 'Notes.' }));
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = [Ref.make(artifact)];
  });

  // `Project.make` materializes the outline too, so the seed writes into that one rather than
  // substituting its own — a replacement would leave the project's own outline orphaned.
  const outline = project.outline?.target;
  if (!outline?.content.target) {
    throw new Error('Expected the project to own an outline.');
  }
  Obj.update(outline.content.target, (text) => {
    text.content = `- [ ] ${OUTLINE_ITEM}\n- [ ] Book the launch review\n`;
  });
  Obj.setParent(instructions, project);

  space.db.add(project);

  // Added after the cascade so the task lands in the persisted task set; membership is the set's
  // `tasks` array, with the parent edge alongside for deletion cascade.
  const task = space.db.add(Task.make({ title: TASK_TITLE, status: 'todo' }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(task)];
  });

  seeded = { space, project, taskSet };
};

/** Adds a task to the set the way the verbs do — array membership plus the lifecycle parent edge. */
const addTask = (space: Space, taskSet: TaskSet.TaskSet, title: string, milestone?: Milestone.Milestone) => {
  const task = space.db.add(Task.make({ title, status: 'todo', milestone: milestone && Ref.make(milestone) }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
  return task;
};

type StoryArgs = {
  role: string;
  attendableId: string;
};

const DefaultStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return <ProjectArticle role={role} subject={project} attendableId={attendableId} />;
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
          types: [
            Project.Project,
            Instructions.Instructions,
            Skill.Skill,
            Text.Text,
            Outline.Outline,
            TaskSet.TaskSet,
            Task.Task,
            Milestone.Milestone,
          ],
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
  args: {
    role: 'article',
    attendableId: 'test',
  },
};

/**
 * Every section the article composes — header form, instructions editor, artifacts, tasks — renders
 * from the seeded project. An invalid surface id is dropped silently, so each section is asserted by
 * its content, not its heading.
 */
export const Sections: Story = {
  ...Default,
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

/**
 * Every section stays live after its first paint. Each step below mutates the seeded objects the
 * way the operation verbs do and asserts the DOM follows — the failure this guards against is a
 * section that resolves once and then goes inert, which is how the previous parent-edge model
 * behaved (`Query.children()` never re-emitted on a member's property change).
 */
export const Updates: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a project.');
    }
    const { space, project, taskSet } = context;

    // 1. A member's own property change: renaming a task must reach its row.
    const RENAMED = 'Renamed in place';
    const [first] = TaskSet.resolveTasks(taskSet);
    Obj.update(first, (first) => {
      first.title = RENAMED;
    });
    await expect(canvas.findByText(RENAMED, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText(TASK_TITLE)).toBeNull(), { timeout: 10_000 });

    // 2. Membership change: a task appended to `taskSet.tasks` must appear.
    const ADDED_TASK = 'Added after mount';
    addTask(space, taskSet, ADDED_TASK);
    await expect(canvas.findByText(ADDED_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 3. A task filed under a milestone is still just a row: the article renders one flat list and
    //    does not group by milestone yet (see TASKS.md), so no heading or backlog split appears.
    const milestone = space.db.add(Milestone.make({ name: MILESTONE_NAME }));
    Obj.setParent(milestone, taskSet);
    Obj.update(taskSet, (taskSet) => {
      taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];
    });
    const MILESTONE_TASK = 'Filed under the milestone';
    addTask(space, taskSet, MILESTONE_TASK, milestone);
    // The milestone renders in its own section.
    await expect(canvas.findByText(MILESTONE_NAME, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // Its task is only a row: the task list does not group by milestone, so no backlog split appears.
    await expect(canvas.findByText(MILESTONE_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText('Backlog')).toBeNull(), { timeout: 10_000 });

    // A rename reaches the row, which holds its own subscription.
    Obj.update(milestone, (milestone) => {
      milestone.name = `${MILESTONE_NAME} (v2)`;
    });
    await expect(canvas.findByText(`${MILESTONE_NAME} (v2)`, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 5. Artifacts are an inline ref array on the project now, so appending a ref must add a card.
    const ADDED_ARTIFACT = 'Added artifact';
    const artifact = space.db.add(Text.make({ name: ADDED_ARTIFACT, content: 'More notes.' }));
    Obj.update(project, (project) => {
      project.artifacts = [...project.artifacts, Ref.make(artifact)];
    });
    await expect(canvas.findByText(ADDED_ARTIFACT, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 6. And removing the ref must drop the card — the delete path splices this array rather than
    //    going through a collection.
    Obj.update(project, (project) => {
      project.artifacts = project.artifacts.filter((ref) => ref.target?.id !== artifact.id);
    });
    await waitFor(() => expect(canvas.queryByText(ADDED_ARTIFACT)).toBeNull(), { timeout: 10_000 });
    await expect(canvas.findByText(ARTIFACT_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
