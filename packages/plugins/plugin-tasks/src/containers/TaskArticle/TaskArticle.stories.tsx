//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Person, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import * as TasksPlugin from '../../TasksPlugin.ts';
import { TaskArticle } from './TaskArticle.tsx';

const WORKED_TASK = 'Finalize roast curve';
const PLAIN_TASK = 'Design label';

/** Kept so a play function can mutate the task and assert the pane follows. */
let seeded: { space: Space; worked: Task.Task } | undefined;

/**
 * History as the verbs write it — one entry per thing that happened to the work, oldest first. No
 * `id`: the field is optional and an `EntityId` when present, so a literal label fails validation.
 */
const history = (...descriptions: string[]): Task.HistoryEntry[] =>
  descriptions.map((description, index) => ({
    date: new Date(Date.now() - (descriptions.length - index) * 8 * 60_000).toISOString(),
    event: index === 0 ? ('created' as const) : ('updated' as const),
    actor: index % 2 === 0 ? { name: 'Rich', role: 'user' as const } : { name: 'Scout', role: 'assistant' as const },
    description,
  }));

/**
 * Two tasks in one set: one worked — description, assignee, history and three artifacts — and one
 * bare, so the pane can be seen with everything it renders and with only its editor.
 */
const seedTasks = (space: Space) => {
  const taskSet = space.db.add(TaskSet.make({ name: 'Spring Blend Launch' }));
  const kai = space.db.add(Obj.make(Person.Person, { fullName: 'Kai Watanabe' }));
  const worked = space.db.add(
    Task.make({
      [Obj.Parent]: taskSet,
      title: WORKED_TASK,
      status: 'started',
      priority: 'high',
      estimate: 'm',
      assignee: { contact: Ref.make(kai) },
      description:
        'Target a 12 minute development window; log every profile so the next batch can be reproduced from the notes rather than from memory.',
      history: history(
        'Task created.',
        'Assigned to Kai Watanabe.',
        'Estimate set to M.',
        'Priority changed from medium to high.',
        'Status changed from todo to started.',
      ),
    }),
  );

  // Artifacts are refs to objects filed in the space, not children of the task — the way
  // `Task.addArtifact` links them, and what the pane's artifact cards resolve.
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

  seeded = { space, worked };
};

type StoryArgs = {
  /** Title of the task the pane opens. */
  title: string;
};

const DefaultStory = ({ title }: StoryArgs) => {
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const task = tasks.find((candidate) => candidate.title === title);
  if (!task) {
    return <Loading data={{ db: !!space?.db, task: false }} />;
  }

  return (
    <div className='dx-expand'>
      <TaskArticle role='article' subject={task} attendableId='story' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/TaskArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The plugin manager, not a bare client provider: the pane edits through `TaskOperation.UpdateTask`,
    // which throws without PluginManagerContext and dies with NoHandlerError without the plugin below.
    withPluginManager({
      plugins: [
        ...corePlugins(),
        TasksPlugin.make(),
        // The card grid under the editor: `cardMasonry` is plugin-space's surface, so without this
        // plugin the artifacts resolve to nothing and the pane renders the editor alone.
        SpacePlugin.make({}),
        // Fills each card's body: a card with no `CardContent` surface is its header alone.
        PreviewPlugin.make(),
        ClientPlugin.make({
          types: [Task.Task, TaskSet.TaskSet, Person.Person, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seedTasks(defaultSpace);
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
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A worked task: title and description in the editor, its history beneath, its artifacts as cards. */
export const Default: Story = {
  args: { title: WORKED_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The title is a field, not text: the pane holds exactly this task selected, so it is always editing.
    await expect(canvas.findByDisplayValue(WORKED_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(
      canvas.findByText('Status changed from todo to started.', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();

    // The cards under the editor are `plugin-space`'s `cardMasonry` surface, which never mounts in
    // this package's storybook (see the tracked item in plugin-projects' TASKS.md) — so assert what
    // the article owns, and leave the cards to the companion story where they do render.
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task.');
    }
    await expect(context.worked.artifacts).toHaveLength(3);
  },
};

/** A task nobody has worked yet: the editor alone, with no history and no cards under it. */
export const Plain: Story = {
  args: { title: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByDisplayValue(PLAIN_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // Nothing produced yet, so nothing is passed to the grid — and nothing renders under the editor
    // whether or not the surface mounts.
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="cardMasonry"]')).toBeNull(), {
      timeout: 10_000,
    });
  },
};
