//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Blob, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import { FixtureLinkSourcePlugin } from '@dxos/plugin-github/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { File, Milestone, Person, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';
import { TasksCapabilities } from '#types';

import * as TasksPlugin from '../../TasksPlugin.ts';
import { TaskSetArticle } from './TaskSetArticle.tsx';

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
      description: 'Curve tracked in [#13007](https://github.com/dxos/dxos/pull/13007).',
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
      description: 'Waits on https://github.com/acme/private/pull/7.',
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
      set.tasks.push(Ref.make(task));
    });
  }
  for (const milestone of [roasting, launch]) {
    Obj.update(set, (set) => {
      set.milestones.push(Ref.make(milestone));
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

/** The article under a key the play function can bump, so it unmounts and mounts afresh. */
const RemountStory = () => {
  const [mount, setMount] = useState(0);
  return (
    <div className='flex flex-col dx-expand'>
      <Button data-testid='story.remount' onClick={() => setMount((mount) => mount + 1)}>
        Remount
      </Button>
      <DefaultStory key={mount} />
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
          types: [TaskSet.TaskSet, Task.Task, Milestone.Milestone, Person.Person, File.File, Blob.Blob],
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
        // Handles `FileOperation.Create`, which is what makes the create pane take dropped files.
        FilePlugin.make(),
        // Contributes the editor extensions the description field takes (`#123` decoration and
        // link chips) and the resolver behind a chip's hover card; PreviewPlugin owns the popover
        // and the storybook layout renders it. Both activate on start events fired here at setup;
        // the fixture source answers the resolver without the network.
        GitHubPlugin.make(),
        PreviewPlugin.make(),
        FixtureLinkSourcePlugin(),
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

export const Default: Story = {};

/**
 * A description renders with the extensions other plugins contribute: the row of the task whose
 * description links a pull request shows it as an anchor chip, through the match plugin-github's
 * resolver contributes. Hovering the chip resolves it through that resolver, and the popover shows
 * the pull request's card.
 */
export const DescriptionLinks: Story = {
  play: async ({ canvasElement }) => {
    // One chip, in the row itself — a React markdown renderer, which sets `eid` as a property. The
    // foot pane is create-only now that the detail is its own surface, so a selected task no longer
    // renders a second copy of the description in CodeMirror.
    const url = 'https://github.com/dxos/dxos/pull/13007';
    const chips = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('dx-anchor')).filter(
        (anchor) => anchor.getAttribute('eid') === url || ('eid' in anchor && anchor.eid === url),
      );
    await waitFor(() => expect(chips()).toHaveLength(1), { timeout: 10_000 });

    await userEvent.hover(chips()[0]);
    await waitFor(() => expect(document.querySelector('[data-id="pullRequestCard"]')).toBeTruthy(), {
      timeout: 10_000,
    });
    await expect(
      within(document.body).findByText('Open on GitHub', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
  },
};

/**
 * A link the resolver matches but cannot answer — a private repository the space holds no token for —
 * still opens its card on hover, titled with the link's short name and saying there is no preview,
 * rather than leaving a chip that does nothing.
 */
export const DescriptionLinkUnavailable: Story = {
  play: async ({ canvasElement }) => {
    const url = 'https://github.com/acme/private/pull/7';
    const chip = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('dx-anchor')).find(
        (anchor) => anchor.getAttribute('eid') === url || ('eid' in anchor && anchor.eid === url),
      );
    await waitFor(() => expect(chip()).toBeTruthy(), { timeout: 10_000 });

    const anchor = chip();
    if (!anchor) {
      throw new Error('The unreachable link did not render as a chip.');
    }
    await userEvent.hover(anchor);
    const card = () => document.querySelector<HTMLElement>('.dx-card-popover');
    await waitFor(() => expect(card()).toBeTruthy(), { timeout: 10_000 });
    await expect(card()).toHaveTextContent('#7');
    await expect(card()).toHaveTextContent('No preview available.');
  },
};

/**
 * Hiding a status from the toolbar's status selector drops its rows, and the menu stays open across
 * several toggles — a reader narrowing a ledger sets more than one.
 */
export const StatusFilter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Re-queried rather than held: the trigger is rebuilt when the deferred menu mounts under it.
    const trigger = () => canvasElement.querySelector<HTMLElement>('[data-testid="tasks.filter.status"]');
    const item = (status: string) =>
      document.querySelector<HTMLElement>(`[data-testid="tasks.filter.status.${status}"]`);
    // The trigger reads as inactive until something narrows the list.
    await expect(trigger()).toHaveAttribute('data-filtered', 'false');
    await userEvent.click(trigger()!);
    await waitFor(() => expect(item('done')).toBeTruthy(), { timeout: 10_000 });

    // Checkboxes, not radios: the group is multi-select, so every status announces its own state.
    await expect(item('done')).toHaveAttribute('role', 'menuitemcheckbox');
    await expect(item('done')).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(item('done')!);
    await waitFor(() => expect(canvas.queryByText('Source green coffee')).toBeNull(), { timeout: 10_000 });
    await waitFor(() => expect(trigger()).toHaveAttribute('data-filtered', 'true'), { timeout: 10_000 });

    // Still open, so the second status is one click away.
    await expect(item('cancelled')).toBeTruthy();
    await userEvent.click(item('cancelled')!);
    await waitFor(() => expect(canvas.queryByText('Print run v1')).toBeNull(), { timeout: 10_000 });
    await expect(canvas.findByText('Finalize roast curve', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Back to every status in one item, rather than re-checking the two by hand.
    await userEvent.click(item('all')!);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Print run v1', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // A hidden status takes the branch filed under it: the sub-task is part of the work its parent
    // stands for, so hiding the parent's status hides it too — even though its own is still shown.
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    const { space, taskSet } = context;
    const parent = TaskSet.resolveTasks(taskSet).find((task) => task.title === 'Source green coffee')!;
    TaskSet.addTask(space.db, taskSet, 'Cup the samples', { status: 'started' }, { parent });
    await expect(canvas.findByText('Cup the samples', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    await userEvent.click(item('done')!);
    await waitFor(() => expect(canvas.queryByText('Source green coffee')).toBeNull(), { timeout: 10_000 });
    await waitFor(() => expect(canvas.queryByText('Cup the samples')).toBeNull(), { timeout: 10_000 });
    // Its own status is still shown — a sibling in it stays.
    await expect(canvas.findByText('Finalize roast curve', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Clear is live on a hidden status alone, not only on typed text: it resets both terms, so with
    // it disabled a reader who had hidden a status could not undo the one filter they had set.
    await userEvent.keyboard('{Escape}');
    const clear = canvasElement.querySelector<HTMLButtonElement>('[data-testid="tasks.filter.clear"]')!;
    await waitFor(() => expect(clear.disabled).toBe(false), { timeout: 10_000 });
    await userEvent.click(clear);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Print run v1', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(trigger()).toHaveAttribute('data-filtered', 'false'), { timeout: 10_000 });
  },
};

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
      taskSet.tasks.push(Ref.make(added));
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
    TaskSet.moveTask(taskSet, cuppings, { parentTask: label });
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

/**
 * A row's menu adds a sub-task under it: the new task is filed into the set with the row as its
 * parent and no title yet — the reader names it in the detail it opens — and a collapsed parent is
 * expanded so the new row is in view.
 */
export const AddSubTask: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Design label', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    const { taskSet } = context;
    const parent = TaskSet.resolveTasks(taskSet).find((task) => task.title === 'Design label')!;
    const parentRow = () => canvas.getByText('Design label').closest<HTMLElement>('[data-testid="taskList.item"]')!;
    const children = () => TaskSet.resolveTasks(taskSet).filter((task) => Task.parentTaskId(task) === parent.id);
    const visible = (id: string) => {
      const row = canvasElement.querySelector<HTMLElement>(`[data-object-id="${id}"]`);
      return !!row && !row.closest('[hidden]');
    };

    const addSubTask = async () => {
      await userEvent.click(parentRow().querySelector<HTMLElement>('[data-testid="taskList.item.actions"]')!);
      const item = await waitFor(
        () => {
          const found = document.querySelector<HTMLElement>('[data-testid="tasks.task.addSubTask"]');
          if (!found) {
            throw new Error('Add sub-task item not found.');
          }
          return found;
        },
        { timeout: 10_000 },
      );
      await userEvent.click(item);
    };

    await addSubTask();
    const first = await waitFor(
      () => {
        const [found] = children();
        if (!found) {
          throw new Error('Sub-task not created.');
        }
        return found;
      },
      { timeout: 10_000 },
    );
    await expect(first.title).toEqual('');
    await waitFor(
      () =>
        expect(
          canvasElement.querySelector(`[data-object-id="${first.id}"]`)?.closest('[role="treeitem"]'),
        ).toHaveAttribute('aria-level', '2'),
      { timeout: 10_000 },
    );

    // Collapse the parent, then add another: the branch opens so both children are in view.
    await userEvent.click(parentRow().querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!);
    await waitFor(() => expect(visible(first.id)).toBe(false), { timeout: 10_000 });
    await addSubTask();
    await waitFor(() => expect(children()).toHaveLength(2), { timeout: 10_000 });
    await waitFor(
      async () => {
        for (const child of children()) {
          await expect(visible(child.id)).toBe(true);
        }
      },
      { timeout: 10_000 },
    );
  },
};

/**
 * A file dropped on the create pane is held until the task is created, then stored and attached to
 * the new task.
 */
export const CreateWithAttachment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Design label', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new globalThis.File(['Grind size 18.'], 'notes.txt', { type: 'text/plain' }));
    for (const type of ['dragenter', 'dragover', 'drop']) {
      pane.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
    }
    await waitFor(() => expect(pane.querySelectorAll('[data-testid="taskList.edit.file"]')).toHaveLength(1), {
      timeout: 10_000,
    });

    await userEvent.click(pane.querySelector<HTMLElement>('[data-testid="taskList.edit.title"]')!);
    await userEvent.keyboard('Dial in the grinder{Enter}');

    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    await waitFor(
      async () => {
        const created = TaskSet.resolveTasks(context.taskSet).find((task) => task.title === 'Dial in the grinder');
        await expect(created?.attachments?.[0]?.target?.name).toEqual('notes.txt');
      },
      { timeout: 10_000 },
    );
    await waitFor(() => expect(pane.querySelectorAll('[data-testid="taskList.edit.file"]')).toHaveLength(0), {
      timeout: 10_000,
    });

    // A file the store refuses (HTML is not an accepted type) is not lost: it stays on the pane.
    const refused = new DataTransfer();
    refused.items.add(new globalThis.File(['<p>hi</p>'], 'page.html', { type: 'text/html' }));
    for (const type of ['dragenter', 'dragover', 'drop']) {
      pane.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: refused }));
    }
    await userEvent.click(pane.querySelector<HTMLElement>('[data-testid="taskList.edit.title"]')!);
    await userEvent.keyboard('Publish the page{Enter}');
    await waitFor(
      async () =>
        await expect(TaskSet.resolveTasks(context.taskSet).some((task) => task.title === 'Publish the page')).toBe(
          true,
        ),
      { timeout: 10_000 },
    );
    await waitFor(
      async () =>
        await expect(
          [...pane.querySelectorAll('[data-testid="taskList.edit.file.name"]')].map((chip) => chip.textContent),
        ).toEqual(['page.html']),
      { timeout: 10_000 },
    );
  },
};

/**
 * The filter is kept per device and per set: a hidden status and a typed query both survive the
 * article unmounting and mounting again, as they do navigating away and back.
 */
export const FilterPersists: Story = {
  render: RemountStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const trigger = () => canvasElement.querySelector<HTMLElement>('[data-testid="tasks.filter.status"]');
    const editor = () => canvasElement.querySelector<HTMLElement>('.cm-content');

    await userEvent.click(trigger()!);
    const done = await waitFor(
      () => {
        const found = document.querySelector<HTMLElement>('[data-testid="tasks.filter.status.done"]');
        if (!found) {
          throw new Error('Status menu not open.');
        }
        return found;
      },
      { timeout: 10_000 },
    );
    await userEvent.click(done);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByText('Source green coffee')).toBeNull(), { timeout: 10_000 });

    await userEvent.click(editor()!);
    await userEvent.keyboard('roast');
    await waitFor(() => expect(canvas.queryByText('Draft launch email')).toBeNull(), { timeout: 10_000 });

    await userEvent.click(canvas.getByTestId('story.remount'));
    await expect(canvas.findByText('Finalize roast curve', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(editor()?.textContent?.trim()).toEqual('roast'), { timeout: 10_000 });
    await expect(canvas.queryByText('Draft launch email')).toBeNull();
    await expect(canvas.queryByText('Source green coffee')).toBeNull();
    await expect(trigger()).toHaveAttribute('data-filtered', 'true');

    // Clearing is persisted too, so the next mount opens unfiltered.
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-testid="tasks.filter.clear"]')!);
    await userEvent.click(canvas.getByTestId('story.remount'));
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Draft launch email', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};

/**
 * Which branches are open is kept per device and per set: a collapsed branch stays collapsed, and an
 * open one open, across the article unmounting and mounting again.
 */
export const CollapsePersists: Story = {
  render: RemountStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Design label', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }
    const { space, taskSet } = context;
    const addChild = (parentTitle: string, title: string) => {
      const parent = TaskSet.resolveTasks(taskSet).find((task) => task.title === parentTitle)!;
      // A sub-task is held by its parent: parented to it and listed in its `subtasks`.
      const child = space.db.add(Task.make({ [Obj.Parent]: parent, title, status: 'todo' }));
      TaskSet.addTaskToSet(taskSet, child, { parent });
    };
    addChild('Design label', 'Pick the typeface');
    addChild('Source green coffee', 'Order the samples');

    const visible = (title: string) => {
      const row = canvas.queryByText(title)?.closest<HTMLElement>('[data-testid="taskList.item"]');
      return !!row && !row.closest('[hidden]');
    };
    const toggle = (title: string) =>
      canvas
        .getByText(title)
        .closest<HTMLElement>('[data-testid="taskList.item"]')!
        .querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!;
    await waitFor(() => expect(visible('Pick the typeface')).toBe(true), { timeout: 10_000 });
    await waitFor(() => expect(visible('Order the samples')).toBe(true), { timeout: 10_000 });

    await userEvent.click(toggle('Design label'));
    await waitFor(() => expect(visible('Pick the typeface')).toBe(false), { timeout: 10_000 });

    await userEvent.click(canvas.getByTestId('story.remount'));
    await expect(canvas.findByText('Design label', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(visible('Order the samples')).toBe(true), { timeout: 10_000 });
    await expect(visible('Pick the typeface')).toBe(false);

    // Reopening is remembered too.
    await userEvent.click(toggle('Design label'));
    await waitFor(() => expect(visible('Pick the typeface')).toBe(true), { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('story.remount'));
    await expect(canvas.findByText('Design label', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(visible('Pick the typeface')).toBe(true), { timeout: 10_000 });
  },
};

/** Frames enough for React to flush a subscription, far short of an index round trip. */
const flushRender = (): Promise<void> =>
  new Promise((resolve) => {
    let remaining = 3;
    const tick = () => (remaining-- > 0 ? requestAnimationFrame(tick) : resolve());
    tick();
  });
