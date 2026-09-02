//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Milestone, Person, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';
import { TasksCapabilities } from '#types';

import * as TasksPlugin from '../../TasksPlugin';
import { TaskSetArticle } from './TaskSetArticle';

/**
 * Stands in for plugin-projects' `delegate-to-chat` contribution — plugin-tasks cannot depend on it
 * (the dependency runs the other way), and what the article gates the checkbox on is that SOME
 * plugin contributed an action, not which one.
 */
const StoryTaskActionPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.tasks.story.taskAction'), name: 'Story Task Action' }),
).pipe(
  Plugin.addModule({
    id: 'task-action',
    provides: [TasksCapabilities.TaskAction],
    activate: () =>
      Effect.succeed([
        Capability.contributeAll(TasksCapabilities.TaskAction, [
          { id: 'story-action', label: 'Story action', icon: 'ph--sparkle--regular', createInvocations: () => [] },
        ]),
      ]),
  }),
  Plugin.make,
);

/** Kept so a play function can mutate the source objects and assert the article follows. */
let seeded: { space: Space; taskSet: TaskSet.TaskSet; roasting: Milestone.Milestone } | undefined;

const TASK_SET_NAME = 'Spring Blend Launch';

/** Seeds one set with two milestones, four filed tasks, and two unfiled (one of them cancelled). */
const seedTaskSet = (space: Space) => {
  const set = space.db.add(TaskSet.make({ name: TASK_SET_NAME }));
  const kai = space.db.add(Obj.make(Person.Person, { fullName: 'Kai Watanabe' }));
  const roasting = space.db.add(Milestone.make({ name: 'Roasting', description: 'Blend locked and repeatable' }));
  const launch = space.db.add(Milestone.make({ name: 'Launch', targetDate: '2026-09-01' }));
  const seed: Array<Partial<Obj.MakeProps<typeof Task.Task>> & { title: string }> = [
    {
      title: 'Source green coffee',
      status: 'done',
      priority: 'high',
      assignee: { contact: Ref.make(kai) },
      milestone: Ref.make(roasting),
    },
    {
      title: 'Finalize roast curve',
      status: 'started',
      priority: 'high',
      assignee: { contact: Ref.make(kai) },
      milestone: Ref.make(roasting),
    },
    {
      title: 'Draft launch email',
      status: 'started',
      assignee: { role: 'assistant', name: 'Scout' },
      milestone: Ref.make(launch),
    },
    {
      title: 'Design label',
      status: 'todo',
      priority: 'medium',
      assignee: { email: 'riley@example.com' },
      milestone: Ref.make(launch),
    },
    {
      title: 'Schedule cuppings',
      status: 'todo',
    },
    {
      title: 'Print run v1',
      status: 'cancelled',
    },
  ];

  for (const props of seed) {
    const task = space.db.add(Task.make(props));
    Obj.update(set, (set) => {
      set.tasks = [...set.tasks, Ref.make(task)];
    });
  }
  for (const milestone of [roasting, launch]) {
    Obj.update(set, (set) => {
      set.milestones = [...set.milestones, Ref.make(milestone)];
    });
  }

  seeded = { space, taskSet: set, roasting };
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const taskSets = useQuery(space?.db, Filter.type(TaskSet.TaskSet));
  const taskSet = taskSets.find((entry) => entry.name === TASK_SET_NAME);
  if (!taskSet) {
    return <Loading data={{ db: !!space?.db, taskSet: false }} />;
  }

  return (
    <div className='dx-expand'>
      <TaskSetArticle role='article' subject={taskSet} attendableId='story' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/TaskSetArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The plugin manager, not a bare client provider: the article invokes the task verbs through
    // `useOperationInvoker`, which throws without PluginManagerContext.
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [TaskSet.TaskSet, Task.Task, Milestone.Milestone, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seedTaskSet(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        // The plugin itself, so its OperationHandler module contributes the task verbs —
        // without it every invoke (move included) dies with NoHandlerError.
        TasksPlugin.make(),
        StoryTaskActionPlugin(),
      ],
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

export const Default: Story = {};

/**
 * The gutter's checkbox is selection, not a status write: it marks which rows a contributed action
 * will act on, and it is offered only because a plugin contributed one (`StoryTaskActionPlugin`).
 *
 * The set lives in `react-ui-attention` view state under the task set's own id, so the article
 * neither owns it nor holds a copy — which is what lets an embedding toolbar read the same set.
 */
export const Checkboxes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    const boxes = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.checkbox"]'));
    await waitFor(() => expect(boxes().length).toBeGreaterThan(1), { timeout: 10_000 });

    await userEvent.click(boxes()[0]);
    await waitFor(() => expect(boxes()[0]).toHaveAttribute('data-state', 'checked'), { timeout: 10_000 });

    // A set, not a single selection.
    await userEvent.click(boxes()[1]);
    await waitFor(() => expect(boxes()[1]).toHaveAttribute('data-state', 'checked'), { timeout: 10_000 });
    await expect(boxes()[0]).toHaveAttribute('data-state', 'checked');

    // Selection only: the row's status control is untouched, which is what completes a task.
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    await expect(TaskSet.resolveTasks(context.taskSet).map((task) => task.status)).toEqual([
      'done',
      'started',
      'started',
      'todo',
      'todo',
      'cancelled',
    ]);
  },
};

/**
 * The set resolves into one flat list and stays live afterwards — each mutation below is the one
 * that would go stale if the view were cached. Milestones are seeded but deliberately not rendered
 * yet (see TASKS.md).
 */
export const Behavior: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Resolves and renders: every task in the array, filed or not, with no milestone chrome.
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // Unfiled tasks are not segregated into a backlog — they are rows like any other.
    await expect(canvas.findByText('Schedule cuppings', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText('Roasting')).toBeNull(), { timeout: 10_000 });
    await waitFor(() => expect(canvas.queryByText('Backlog')).toBeNull(), { timeout: 10_000 });

    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    const { space, taskSet, roasting } = context;

    // Updates — membership: appending to the array parents the task to the set, joining it to the
    // `childOf` query.
    const added = space.db.add(
      Task.make({ title: 'Order sample bags', status: 'todo', milestone: Ref.make(roasting) }),
    );
    Obj.update(taskSet, (taskSet) => {
      taskSet.tasks = [...taskSet.tasks, Ref.make(added)];
    });
    await expect(canvas.findByText('Order sample bags', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Updates — a member's own properties reach its row (the row holds that subscription).
    Obj.update(added, (added) => {
      added.title = 'Order sample bags (v2)';
      added.status = 'done';
    });
    await expect(canvas.findByText('Order sample bags (v2)', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    const cuppings = TaskSet.resolveTasks(taskSet).find((task) => task.title === 'Schedule cuppings')!;
    const label = TaskSet.resolveTasks(taskSet).find((task) => task.title === 'Design label')!;
    Obj.update(cuppings, (cuppings) => {
      cuppings.parentTask = Ref.make(label);
    });
    await flushRender();
    // `treeitem`, not `option`: the list renders through `Tree` now, and `aria-level` sits on the
    // branch wrapper the row is nested in (see react-ui-list/docs/TREE.md §10).
    await expect(canvas.getByText('Schedule cuppings').closest('[role="treeitem"]')).toHaveAttribute('aria-level', '2');

    // Updates — removal: an array splice alone does not unlist a task (membership is the parent
    // edge) — deleting it does.
    TaskSet.deleteTask(space.db, taskSet, added);
    await waitFor(() => expect(canvas.queryByText('Order sample bags (v2)')).toBeNull(), { timeout: 10_000 });
  },
};

/** Frames enough for React to flush a subscription, far short of an index round trip. */
const flushRender = (): Promise<void> =>
  new Promise((resolve) => {
    let remaining = 3;
    const tick = () => (remaining-- > 0 ? requestAnimationFrame(tick) : resolve());
    tick();
  });
