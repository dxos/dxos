//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer, ViewStateProvider, useSelectionActions } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Milestone, Outline, Repo, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectTaskCompanion } from './ProjectTaskCompanion.tsx';

const ATTENDABLE_ID = 'story';
const PROJECT_NAME = 'Spring Blend Launch';
const WORKED_TASK = 'Finalize roast curve';
const PLAIN_TASK = 'Design label';

/** Kept so a story can select a task and assert against the objects it was seeded from. */
let seeded: { space: Space; project: Project.Project; worked: Task.Task; plain: Task.Task } | undefined;

/**
 * History as the verbs write it — one entry per thing that happened to the work, oldest first. The
 * dates are minutes apart so the pane's relative stamps ("8 minutes ago") differ per row.
 */
const history = (...descriptions: string[]): Task.HistoryEntry[] =>
  descriptions.map((description, index) => ({
    // No `id`: it is an `EntityId`, and the field is optional — entries the verbs wrote before ids
    // existed load the same way (see `Task.CreatedEntry`).
    date: new Date(Date.now() - (descriptions.length - index) * 8 * 60_000).toISOString(),
    event: index === 0 ? ('created' as const) : ('updated' as const),
    actor: index % 2 === 0 ? { name: 'Rich', role: 'user' as const } : { name: 'Scout', role: 'assistant' as const },
    description,
  }));

/**
 * A project whose ledger holds two tasks: one that has been worked — a description, a history, and
 * three artifacts of different types — and one bare task, so a story can switch between a full
 * companion and an almost empty one.
 */
const createProject = (space: Space) => {
  const project = space.db.add(Project.make({ name: PROJECT_NAME }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }

  const worked = space.db.add(
    Task.make({
      [Obj.Parent]: taskSet,
      title: WORKED_TASK,
      status: 'started',
      priority: 'high',
      estimate: 'm',
      description:
        'Target a 12 minute development window; log every profile so the next batch can be reproduced from the notes rather than from memory.',
      history: history(
        'Task created.',
        'Assigned to Scout.',
        'Estimate set to M.',
        'Priority changed from medium to high.',
        'Status changed from todo to started.',
      ),
    }),
  );

  // Artifacts are refs to objects filed in the space, not children of the task — the way
  // `Task.addArtifact` links them, and what the companion's card grid resolves.
  for (const [name, content] of [
    ['Cupping Sheet', 'Sweetness 7, acidity 8, body 6. Second crack at 9:40.'],
    ['Roast Log — Batch 14', 'Charge 198°C, turnaround 1:35, development 2:10.'],
    ['Supplier Notes', 'Two Ethiopian lots and one Colombian, sampled before committing to a full bag.'],
  ] as const) {
    Task.addArtifact(worked, space.db.add(Text.make({ name, content })));
  }

  const plain = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: PLAIN_TASK, status: 'todo' }));
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(worked), Ref.make(plain)];
  });

  seeded = { space, project, worked, plain };
};

type StoryArgs = {
  /** Title of the task the story selects, or nothing — which leaves the companion on its empty state. */
  select?: string;
};

/**
 * The companion reads its subject from the ledger's selection rather than from a prop, so the story
 * publishes one into the same attention context the component reads — which is what
 * `TaskSetArticle` does through `LayoutOperation.Select` in the app.
 */
const DefaultStory = (args: StoryArgs) => (
  // The selection the companion reads is view state, which needs a provider to hold it; the deck
  // supplies one in the app.
  <ViewStateProvider>
    <SelectedTask {...args} />
  </ViewStateProvider>
);

const SelectedTask = ({ select }: StoryArgs) => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const selected = tasks.find((task) => task.title === select);
  const { single, clear } = useSelectionActions(ATTENDABLE_ID);

  useEffect(() => {
    if (selected) {
      single(selected.id);
    } else {
      clear();
    }
  }, [selected?.id, single, clear]);

  if (!project) {
    return <Loading data={{ db: !!space?.db, project: false }} />;
  }

  return (
    <AttendableContainer id={ATTENDABLE_ID} classNames='contents'>
      <ProjectTaskCompanion role='article' attendableId={ATTENDABLE_ID} project={project} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectTaskCompanion',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        // The task article the companion mounts for its subject.
        TasksPlugin.make(),
        // The card grid under it: `cardMasonry` is plugin-space's surface, so without this plugin the
        // artifacts resolve to nothing and the companion renders the article alone.
        SpacePlugin.make({}),
        // Fills each card's body: a card with no `CardContent` surface is its header alone.
        PreviewPlugin.make(),
        ClientPlugin.make({
          types: [
            Project.Project,
            Instructions.Instructions,
            Outline.Outline,
            Repo.Repo,
            Task.Task,
            TaskSet.TaskSet,
            Milestone.Milestone,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                createProject(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
      setupEvents: [MarkdownEvents.Start, PreviewEvents.Start],
    }),
  ],
  parameters: {
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations, ...formTranslations, ...tasksTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A worked task: title and description in the editor, its history beneath, its artifacts as cards. */
export const Default: Story = {
  args: { select: WORKED_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByDisplayValue(WORKED_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // The history the verbs would have written, newest first in the pane.
    await expect(
      canvas.findByText('Status changed from todo to started.', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
    // Each artifact as a card in the grid plugin-space contributes.
    const grid = () => canvasElement.querySelector<HTMLElement>('[data-testid="cardMasonry"]');
    await waitFor(() => expect(grid()).toBeTruthy(), { timeout: 10_000 });
    await expect(
      within(grid()!).findAllByText('Cupping Sheet', undefined, { timeout: 10_000 }),
    ).resolves.not.toHaveLength(0);
  },
};

/** A task nobody has worked yet: the editor alone, with no history and no cards under it. */
export const Plain: Story = {
  args: { select: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByDisplayValue(PLAIN_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // No artifacts: the grid renders nothing rather than an empty region under the editor.
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="cardMasonry"]')).toBeNull(), {
      timeout: 10_000,
    });
  },
};

/** Nothing selected in the ledger: the companion says so rather than rendering an empty pane. */
export const NoSelection: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[role="status"]')).toBeTruthy(), { timeout: 10_000 });
  },
};
