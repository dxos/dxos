//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Obj, Ref } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { type TaskPlacement } from './hierarchy';
import { TaskList, type TaskPatch } from './TaskList';

const seed = (): Task.Task[] => [
  Task.make({
    title: 'Source green coffee',
    status: 'done',
    priority: 'high',
    description:
      'Two Ethiopian lots and one Colombian, sampled before committing to a full bag. Supplier list: https://example.com/suppliers',
  }),
  Task.make({
    title: 'Finalize roast curve',
    status: 'started',
    priority: 'high',
    description:
      'Target a 12 minute development window; log every profile so the next batch can be reproduced from the notes rather than from memory.',
  }),
  Task.make({
    title: 'Publish the tasting notes',
    status: 'todo',
    // Reference forms the markdown surfaces are expected to linkify: a bare URL and a GitHub issue.
    description:
      'Draft lives at https://github.com/dxos/dxos/pull/12752 and the preview is https://pr-12752-composer-dev.dxos.workers.dev; blocked on #12431.',
  }),
  Task.make({
    title: 'Draft launch email',
    status: 'started',
    priority: 'high',
    assignee: { role: 'assistant', name: 'Scout' },
  }),
  Task.make({
    title: 'Design label',
    status: 'todo',
    assignee: { email: 'riley@example.com' },
  }),
  Task.make({
    title: 'Print run v1',
    status: 'cancelled',
  }),
];

/**
 * Two roots with sub-tasks two levels deep. Array order is sibling order only, so the seed
 * deliberately interleaves the two branches — a list that walked the array instead of the tree
 * would render them out of order, which is the bug this story exists to catch.
 */
const hierarchicalSeed = (): Task.Task[] => {
  const release = Task.make({ title: 'Ship the spring release', status: 'started', priority: 'high' });
  const roast = Task.make({ title: 'Dial in the roast', status: 'todo' });
  const notes = Task.make({
    title: 'Write the tasting notes',
    status: 'todo',
    parentTask: Ref.make(release),
    description: 'One paragraph per lot, in the order they are poured.',
  });
  const sample = Task.make({ title: 'Sample the Ethiopian lots', status: 'done', parentTask: Ref.make(roast) });
  const label = Task.make({ title: 'Approve the label art', status: 'todo', parentTask: Ref.make(release) });
  const curve = Task.make({ title: 'Log every profile', status: 'started', parentTask: Ref.make(roast) });
  const proof = Task.make({ title: 'Proofread the back label', status: 'todo', parentTask: Ref.make(label) });
  return [release, roast, notes, sample, label, curve, proof];
};

const DefaultStory = ({
  readonly,
  showGroupLabels,
  showOrdinals,
  showDescriptions,
  hierarchical,
}: {
  readonly?: boolean;
  showGroupLabels?: boolean;
  showOrdinals?: boolean;
  showDescriptions?: boolean;
  hierarchical?: boolean;
}) => {
  const [tasks, setTasks] = useState<Task.Task[]>(hierarchical ? hierarchicalSeed : seed);
  // Selection is what the article wires, and what arrow-key navigation moves.
  const [selected, setSelected] = useState<string>();

  const handleCreate = useCallback((title: string) => {
    setTasks((tasks) => [...tasks, Task.make({ title, status: 'todo' })]);
  }, []);

  const handleUpdate = useCallback((task: Task.Task, patch: TaskPatch) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setTasks((tasks) => [...tasks]);
  }, []);

  const handleDelete = useCallback((task: Task.Task) => {
    setTasks((tasks) => tasks.filter(({ id }) => id !== task.id));
  }, []);

  // Stands in for the `MoveTask` verb: re-parent and reposition in one step, since that is the
  // contract the list is written against.
  const handleMove = useCallback((task: Task.Task, { parentTask, before }: TaskPlacement) => {
    Obj.update(task, (task) => {
      if (parentTask) {
        task.parentTask = Ref.make(parentTask);
      } else {
        delete task.parentTask;
      }
    });
    setTasks((tasks) => {
      const rest = tasks.filter(({ id }) => id !== task.id);
      const anchor = before ? rest.findIndex(({ id }) => id === before.id) : -1;
      return anchor === -1 ? [...rest, task] : [...rest.slice(0, anchor), task, ...rest.slice(anchor)];
    });
  }, []);

  return (
    <TaskList.Root
      tasks={tasks}
      hierarchical={hierarchical}
      selected={selected}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescriptions={showDescriptions}
      onTaskCreate={readonly ? undefined : handleCreate}
      onTaskUpdate={readonly ? undefined : handleUpdate}
      onTaskDelete={readonly ? undefined : handleDelete}
      onTaskMove={readonly || !hierarchical ? undefined : handleMove}
      onTaskSelect={(task) => setSelected(task.id)}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      <TaskList.Edit />
    </TaskList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-task/TaskList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Readonly: Story = {
  args: {
    readonly: true,
  },
};

export const WithoutGroupLabels: Story = {
  args: {
    showGroupLabels: false,
  },
};

export const WithOrdinals: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
  },
};

export const WithDescriptions: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
    showDescriptions: true,
  },
};

export const Hierarchical: Story = {
  args: {
    hierarchical: true,
    showOrdinals: true,
    showDescriptions: true,
  },
};

export const TestEdit: Story = {
  args: { showGroupLabels: false, showOrdinals: true },
  // The pane is the detail half: it creates when nothing is selected and edits the selection
  // otherwise, which is the whole reason editing moved out of the row.
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLTextAreaElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    // Nothing selected: the pane creates, and has no description to attach one to.
    await expect(title().value).toEqual('');
    await expect(description()).toBeNull();

    // Selecting a task fills the pane with it.
    const first = rows()[0];
    const firstTitle = first.querySelector('.truncate')!.textContent;
    first.click();
    await waitFor(async () => expect(title().value).toEqual(firstTitle));
    await waitFor(async () => expect(description()).not.toBeNull());

    // Editing the description writes it back on blur.
    await userEvent.click(description()!);
    await userEvent.keyboard(' — amended');
    description()!.blur();
    await waitFor(async () => expect(rows()[0].textContent).toContain(firstTitle));
    await expect(description()!.value).toContain('amended');
  },
};

export const TestHierarchy: Story = {
  // Descriptions on, so the alignment between a sub-task's description and its title is asserted.
  args: { hierarchical: true, showOrdinals: true, showDescriptions: true },
  // The tree is what the walk produces, not what the array holds; and restructuring is driven from
  // the keyboard, which is the half of the gesture set that CAN be synthesized (a native HTML5 drag
  // cannot).
  play: async ({ canvasElement }) => {
    const rows = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')).map((row) => ({
        row,
        title: row.querySelector('.truncate')?.textContent ?? '',
        level: Number(row.getAttribute('aria-level')),
        ordinal: row.querySelector('.tabular-nums')?.textContent ?? '',
      }));
    const shape = () => rows().map(({ title, level }) => `${title}:${level}`);
    const toggle = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!;
    const press = (row: HTMLElement, key: string) => {
      row.focus();
      row.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true, bubbles: true }));
    };

    // Interleaved in the array, nested in the walk.
    await expect(shape()).toEqual([
      'Ship the spring release:1',
      'Write the tasting notes:2',
      'Approve the label art:2',
      'Proofread the back label:3',
      'Dial in the roast:1',
      'Sample the Ethiopian lots:2',
      'Log every profile:2',
    ]);

    // Ordinals stay flat — position in the set, so a task keeps its number as the tree changes.
    await expect(rows().map(({ ordinal }) => ordinal)).toEqual(['1', '3', '5', '7', '2', '4', '6']);

    // Collapsing a branch hides its descendants and marks the row.
    toggle(rows()[0].row).click();
    await waitFor(async () => {
      await expect(rows().map(({ title }) => title)).toEqual([
        'Ship the spring release',
        'Dial in the roast',
        'Sample the Ethiopian lots',
        'Log every profile',
      ]);
      await expect(rows()[0].row.getAttribute('aria-expanded')).toEqual('false');
    });
    toggle(rows()[0].row).click();
    await waitFor(async () => expect(rows()).toHaveLength(7));

    // Alt-ArrowLeft outdents: the sub-task becomes the next sibling of its parent.
    await expect(rows()[1].title).toEqual('Write the tasting notes');
    press(rows()[1].row, 'ArrowLeft');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:1',
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
      ]),
    );

    // ...and Alt-ArrowRight indents it back under the sibling above it.
    press(rows()[3].row, 'ArrowRight');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:2',
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
      ]),
    );

    // Arrow keys step row to row and selection follows focus — the listbox aspect's own mechanism,
    // which only works because each row is a Tabster groupper: without one the arrow lands on the
    // row's first button instead of the next row.
    const secondRowTitle = rows()[1].title;
    rows()[0].row.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () =>
      expect(canvasElement.querySelector('[aria-selected="true"]')?.textContent).toContain(secondRowTitle),
    );
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(async () =>
      expect(canvasElement.querySelector('[aria-selected="true"]')?.textContent).toContain(rows()[0].title),
    );

    // Moving a parent carries its sub-tasks: only the parent's own parentTask is written, so the
    // descendants' refs still point at it wherever it lands.
    const release = rows().find(({ title }) => title === 'Ship the spring release')!;
    press(release.row, 'ArrowDown');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:2',
      ]),
    );
    press(rows().find(({ title }) => title === 'Ship the spring release')!.row, 'ArrowUp');
    await waitFor(async () => expect(rows()[0].title).toEqual('Ship the spring release'));

    // Each row is findable by task id, which is how the drag preview collects a subtree to clone.
    await expect(canvasElement.querySelectorAll('[data-task-id]')).toHaveLength(7);

    // The create row's input starts where a row's title text does. The columns already match; what
    // differs is that a tree row's title sits past its disclosure toggle and the create row has none.
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    await expect(Math.round(create.querySelector('input')!.getBoundingClientRect().left)).toEqual(
      Math.round(rows()[0].row.querySelector('.truncate')!.getBoundingClientRect().left),
    );

    // Every row carries a handle in the ordinal's own gutter — the ordinal and the handle share one
    // cell, so nothing shifts when the cursor crosses a row. The drop itself needs a real pointer
    // (native HTML5 drag events cannot be synthesized), so the manual script covers the gesture.
    const handles = canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.dragHandle"]');
    await expect(handles).toHaveLength(7);
    await expect(canvasElement.querySelectorAll('[draggable="true"]')).toHaveLength(7);
    const gutter = (element: Element) => Math.round(element.getBoundingClientRect().left);
    await expect(gutter(handles[0])).toEqual(gutter(rows()[0].row.querySelector('.tabular-nums')!.parentElement!));

    // A description lines up under its own title, not under the column — it is indented with the
    // row and clears the disclosure toggle.
    const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;
    const description = described.row.querySelector<HTMLElement>('.line-clamp-3')!;
    const textStart = (element: HTMLElement) =>
      Math.round(element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingInlineStart));
    await expect(textStart(description)).toEqual(
      Math.round(described.row.querySelector('.truncate')!.getBoundingClientRect().left),
    );
  },
};

export const Test: Story = {
  // The status toggle and the add-`+` share one row grid; assert their icon gutters actually line
  // up, since only geometry (not the DOM) shows the misalignment.
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item"]');
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!row || !create) {
      throw new Error('Task rows not found.');
    }

    const center = (element: Element) => {
      const { left, width } = element.getBoundingClientRect();
      return left + width / 2;
    };

    const rowIcon = row.firstElementChild;
    // The pane is a column: the title row is the grid whose gutters must line up with a task row.
    const createIcon = create.firstElementChild?.firstElementChild;
    if (!rowIcon || !createIcon) {
      throw new Error('Row icons not found.');
    }

    // Same icon column ⇒ same horizontal centre (sub-pixel tolerance for rounding).
    await expect(Math.abs(center(rowIcon) - center(createIcon))).toBeLessThan(1);
    // ...and the labels start at the same x.
    await expect(
      Math.abs(
        row.children[1].getBoundingClientRect().left -
          (create.firstElementChild as HTMLElement).children[1].getBoundingClientRect().left,
      ),
    ).toBeLessThan(1);

    // The row spans the full width, so trailing actions sit at the far edge.
    await expect(row.getBoundingClientRect().width).toBeGreaterThan(create.getBoundingClientRect().width * 0.9);
  },
};
