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
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import { FixtureLinkSourcePlugin } from '@dxos/plugin-github/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Milestone, Person, Task, TaskSet } from '@dxos/types';

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
    await userEvent.click(trigger()!);
    await waitFor(() => expect(item('done')).toBeTruthy(), { timeout: 10_000 });

    // Checkboxes, not radios: the group is multi-select, so every status announces its own state.
    await expect(item('done')).toHaveAttribute('role', 'menuitemcheckbox');
    await expect(item('done')).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(item('done')!);
    await waitFor(() => expect(canvas.queryByText('Source green coffee')).toBeNull(), { timeout: 10_000 });

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
    const subTask = space.db.add(
      Task.make({ title: 'Cup the samples', status: 'started', parentTask: Ref.make(parent) }),
    );
    Obj.update(taskSet, (taskSet) => {
      taskSet.tasks.push(Ref.make(subTask));
    });
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
  },
};

/**
 * The status menu and the query text are two views over one value: picking a status in the menu
 * rewrites the text, and editing the text re-checks the menu. The value is persisted per device,
 * under the set's id, through the `local` view-state backend.
 */
export const SharedFilterState: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }

    const editor = () => canvasElement.querySelector<HTMLElement>('[role="toolbar"] .cm-content');
    const trigger = () => canvasElement.querySelector<HTMLElement>('[data-testid="tasks.filter.status"]');
    const item = (status: string) =>
      document.querySelector<HTMLElement>(`[data-testid="tasks.filter.status.${status}"]`);
    const stored = () => globalThis.localStorage.getItem(`dxos:view-state:tasks-task-set-view:${context.taskSet.id}`);

    // Menu → text: hiding a status writes it into the query.
    await clickElement(trigger());
    await waitFor(() => expect(item('done')).toBeTruthy(), { timeout: 10_000 });
    await clickElement(item('done'));
    await waitFor(() => expect(canvas.queryByText('Source green coffee')).toBeNull(), { timeout: 10_000 });
    await waitFor(() => expect(editor()).toHaveTextContent('NOT status:done'), { timeout: 10_000 });
    await expect(stored()).toContain('NOT status:done');
    await userEvent.keyboard('{Escape}');

    // Text → menu: replacing the query with a single status re-checks the menu to match.
    await clickElement(editor());
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    await waitFor(() => expect(stored()).toContain('"query":""'), { timeout: 10_000 });
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await userEvent.keyboard('status:started');
    await waitFor(() => expect(canvas.queryByText('Design label')).toBeNull(), { timeout: 10_000 });
    await expect(canvas.findByText('Finalize roast curve', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await userEvent.keyboard('{Escape}');

    await clickElement(trigger());
    await waitFor(() => expect(item('started')).toHaveAttribute('aria-checked', 'true'), { timeout: 10_000 });
    await expect(item('todo')).toHaveAttribute('aria-checked', 'false');
    await expect(item('done')).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * Grouping puts the rows under collapsible headers with counts, and a sort reorders the rows within
 * each group. Both choices persist per device beside the filter, and dragging is off while either is
 * set, since a drop writes the set's own order.
 */
export const SortAndGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Source green coffee', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task set.');
    }

    const option = (testId: string) => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    const headers = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.group.header"]')).map((header) =>
        header.textContent?.trim(),
      );
    // Visible rows only: a collapsed branch hides its rows rather than unmounting them.
    const titles = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.title"]'))
        .filter((title) => title.checkVisibility())
        .map((title) => title.textContent);
    const stored = () =>
      JSON.parse(globalThis.localStorage.getItem(`dxos:view-state:tasks-task-set-view:${context.taskSet.id}`) ?? '{}');

    // Group by status: one header per non-empty status, in the status table's order, with its count.
    await clickElement(canvasElement.querySelector<HTMLElement>('[data-testid="tasks.group"]'));
    await waitFor(() => expect(option('tasks.group.status')).toBeTruthy(), { timeout: 10_000 });
    await clickElement(option('tasks.group.status'));
    await waitFor(() => expect(headers()).toEqual(['Todo2', 'Started2', 'Done1', 'Cancelled1']), { timeout: 10_000 });
    await expect(stored().group).toEqual('status');

    // A header collapses like a branch.
    const doneGroup = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.group"]')).find((row) =>
        row.textContent?.includes('Done'),
      ) ?? null;
    await clickElement(doneGroup()?.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]') ?? null);
    await waitFor(() => expect(titles()).not.toContain('Source green coffee'), { timeout: 10_000 });
    await expect(headers()).toContain('Done1');

    // Order by title, descending: rows reorder within their group.
    await clickElement(canvasElement.querySelector<HTMLElement>('[data-testid="tasks.sort"]'));
    await waitFor(() => expect(option('tasks.sort.title')).toBeTruthy(), { timeout: 10_000 });
    await clickElement(option('tasks.sort.title'));
    await clickElement(canvasElement.querySelector<HTMLElement>('[data-testid="tasks.sort"]'));
    await waitFor(() => expect(option('tasks.sort.desc')).toBeTruthy(), { timeout: 10_000 });
    await clickElement(option('tasks.sort.desc'));
    await waitFor(
      () =>
        expect(titles()).toEqual([
          'Schedule cuppings',
          'Design label',
          'Finalize roast curve',
          'Draft launch email',
          'Print run v1',
        ]),
      { timeout: 10_000 },
    );
    await expect(stored().sort).toEqual({ field: 'title', direction: 'desc' });

    // Ungrouped, the sort still holds across the whole list.
    await clickElement(canvasElement.querySelector<HTMLElement>('[data-testid="tasks.group"]'));
    await waitFor(() => expect(option('tasks.group.none')).toBeTruthy(), { timeout: 10_000 });
    await clickElement(option('tasks.group.none'));
    await waitFor(() => expect(headers()).toEqual([]), { timeout: 10_000 });
    await waitFor(
      () =>
        expect(titles()).toEqual([
          'Source green coffee',
          'Schedule cuppings',
          'Print run v1',
          'Finalize roast curve',
          'Draft launch email',
          'Design label',
        ]),
      { timeout: 10_000 },
    );
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
 * that would go stale if the view were cached. Milestones are seeded but, ungrouped, not rendered.
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

const clickElement = async (element: HTMLElement | null): Promise<void> => {
  if (!element) {
    throw new Error('The element to click is not rendered.');
  }
  await userEvent.click(element);
};
