//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Obj, Ref } from '@dxos/echo';
import { createMenuAction } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { type TaskPlacement } from './hierarchy';
import { TaskList } from './TaskList';

const seed = (): Task.Task[] => [
  Task.make({
    title: 'Source green coffee',
    status: 'done',
    priority: 'high',
    description:
      'Two Ethiopian lots and one Colombian, sampled before committing to a full bag. Supplier list: https://example.com/suppliers',
  }),
  // Artifacts render as tags beside priority: what the task produced, not what it is.
  Task.make({
    title: 'Write the launch poem',
    status: 'review',
    reviewers: [{ name: 'Rich', role: 'user' }],
    artifacts: [Ref.make(Task.make({ title: 'Ode to a Coffee Bean' }))],
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
 * Ten tasks, one per row and every status represented — enough to fill the viewport, take the
 * ordinals into double digits, and put more than one task under each group heading, which a
 * seven-task list does not.
 */
const manySeed = (): Task.Task[] => [
  Task.make({ title: 'Source green coffee', status: 'done', priority: 'high' }),
  Task.make({ title: 'Cup the samples', status: 'done' }),
  Task.make({ title: 'Finalize roast curve', status: 'started', priority: 'high' }),
  Task.make({ title: 'Draft launch email', status: 'started', assignee: { role: 'assistant', name: 'Scout' } }),
  Task.make({
    title: 'Write the launch poem',
    status: 'review',
    reviewers: [{ name: 'Rich', role: 'user' }],
    artifacts: [Ref.make(Task.make({ title: 'Ode to a Coffee Bean' }))],
  }),
  Task.make({ title: 'Design label', status: 'todo', assignee: { email: 'riley@example.com' } }),
  Task.make({ title: 'Publish the tasting notes', status: 'todo' }),
  Task.make({ title: 'Book the launch venue', status: 'todo', priority: 'low' }),
  Task.make({ title: 'Print run v1', status: 'cancelled' }),
  Task.make({ title: 'Ship the pre-orders', status: 'failed', priority: 'urgent' }),
];

/**
 * Two roots with sub-tasks two levels deep. Array order is sibling order only, so the seed
 * deliberately interleaves the two branches — a list that walked the array instead of the tree
 * would render them out of order, which is the bug this story exists to catch.
 */
const hierarchicalSeed = (): Task.Task[] => {
  const release = Task.make({
    title: 'Ship the spring release',
    status: 'started',
    priority: 'high',
  });
  const roast = Task.make({
    title: 'Dial in the roast',
    status: 'todo',
  });
  const notes = Task.make({
    title: 'Write the tasting notes',
    status: 'todo',
    parentTask: Ref.make(release),
    description: 'One paragraph per lot, in the order they are poured.',
  });
  const sample = Task.make({
    title: 'Sample the Ethiopian lots',
    status: 'done',
    parentTask: Ref.make(roast),
  });
  const label = Task.make({
    title: 'Approve the label art',
    status: 'todo',
    parentTask: Ref.make(release),
  });
  const curve = Task.make({
    title: 'Log every profile',
    status: 'started',
    parentTask: Ref.make(roast),
  });
  const proof = Task.make({
    title: 'Proofread the back label',
    status: 'todo',
    parentTask: Ref.make(label),
  });

  return [release, roast, notes, sample, label, curve, proof];
};

const DefaultStory = ({
  readonly,
  showGroupLabels,
  showOrdinals,
  showDescriptions,
  showDescription = true,
  hierarchical,
  many,
  framed = true,
}: {
  readonly?: boolean;
  showGroupLabels?: boolean;
  showOrdinals?: boolean;
  showDescriptions?: boolean;
  /** Edit the selected task's description in the pane; the pane's own prop, not the rows'. */
  showDescription?: boolean;
  hierarchical?: boolean;
  /** Seed the longer, ten-task list instead of the default seven. */
  many?: boolean;
  /** Insets the pane in a card, as an article does. Off for the tests that measure the pane's own
      columns against a row's, which the inset would offset. */
  framed?: boolean;
}) => {
  const [tasks, setTasks] = useState<Task.Task[]>(hierarchical ? hierarchicalSeed : many ? manySeed : seed);
  // Selection is what the article wires, and what arrow-key navigation moves.
  const [selected, setSelected] = useState<string>();

  const handleCreate = useCallback(({ title, ...props }: Task.Draft) => {
    setTasks((tasks) => [...tasks, Task.make({ title, status: 'todo', ...props })]);
  }, []);

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setTasks((tasks) => [...tasks]);
  }, []);

  // Delete is an ordinary contributed action now, which is also what a plugin's own actions look like.
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: 'Delete task',
        icon: 'ph--x--regular',
        testId: 'taskList.item.delete',
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
      getTaskActions={readonly ? undefined : getTaskActions}
      onTaskMove={readonly || !hierarchical ? undefined : handleMove}
      onTaskSelect={(task) => setSelected(task?.id)}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      {framed ? (
        <div className='p-2'>
          <TaskList.Edit showDescription={showDescription} classNames='border border-separator rounded-md p-2' />
        </div>
      ) : (
        <TaskList.Edit grid showDescription={showDescription} />
      )}
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

/** A list long enough to scroll, group and number into double digits. */
export const TenTasks: Story = {
  args: {
    many: true,
    showOrdinals: true,
  },
};

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
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    // Nothing selected: the pane creates. Its description belongs to the task being created, so it
    // starts empty rather than absent (see `TestCreateWithDescription`).
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(description()).not.toBeNull());

    // ...and offers no Save/Cancel: with nothing typed there is nothing to save and nothing to
    // cancel, and two dead controls read as a form to fill in rather than a place to type.
    const save = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.save"]');
    await expect(save()).toBeNull();
    await userEvent.click(title());
    await userEvent.keyboard('Something');
    await waitFor(async () => expect(save()).not.toBeNull());
    await userEvent.clear(title());
    await waitFor(async () => expect(save()).toBeNull());

    // A half-typed title that loses focus creates nothing: leaving the field is not a decision to
    // add a task. Enter and Save are the deliberate acts, and they still work.
    const before = rows().length;
    await userEvent.click(title());
    await userEvent.keyboard('Stray');
    await expect(title().value).toEqual('Stray');
    // Tab rather than `blur()`: a real focus move is what a reader does, and what React's delegated
    // focusout listens for.
    await userEvent.tab();
    await waitFor(async () => expect(title()).not.toEqual(document.activeElement));
    await expect(rows()).toHaveLength(before);
    await userEvent.clear(title());

    // Selecting a task fills the pane with it.
    const first = rows()[0];
    const firstTitle = first.querySelector('.truncate')!.textContent;
    first.click();
    await waitFor(async () => expect(title().value).toEqual(firstTitle));
    await waitFor(async () => expect(description()).not.toBeNull());

    // Escape gives the reader a way back out: the selection clears and the pane returns to creating.
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);

    // Re-select for the remaining assertions.
    first.click();
    await waitFor(async () => expect(description()).not.toBeNull());

    // The description is a markdown editor, held open — the pane IS the editor, so there is nothing
    // to click into.
    await waitFor(async () => expect(description()!.querySelector('.cm-content')).not.toBeNull());

    // ...and its text starts where the title's does. CodeMirror insets its own content, which would
    // otherwise sit the description further in than the field above it.
    const left = (element: Element) => Math.round(element.getBoundingClientRect().left);
    await expect(left(description()!.querySelector('.cm-line')!)).toEqual(left(title()));

    // Tab moves from the title into the description's TEXT. The editor otherwise puts its tab stop
    // on a wrapper that needs a further Enter to get into, so the caret was two keys away.
    title().focus();
    await userEvent.tab();
    await waitFor(async () => expect(document.activeElement).toEqual(description()!.querySelector('.cm-content')));

    // ...and Tab leaves again rather than indenting, so the field is not a trap.
    await userEvent.tab();
    await waitFor(async () => expect(description()!.contains(document.activeElement)).toBeFalsy());

    // Save writes the pending description and leaves, dropping the pane back to creating.
    const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;
    const text = () => content().textContent ?? '';
    await userEvent.click(content());
    await userEvent.keyboard(' KEEP');
    await userEvent.click(pane.querySelector<HTMLElement>('[data-testid="taskList.edit.save"]')!);
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    // The pane is creating again, so the field it kept is the new task's and holds none of the
    // edited one's text.
    await expect(text()).not.toContain('KEEP');

    // Cancel leaves the same way but throws the pending edit away. The buttons must not take focus:
    // the fields commit on blur, so a Cancel that stole focus would have written the very text it is
    // meant to discard — as would the blur that tearing the editor down fires.
    rows()[0].click();
    await waitFor(async () => expect(description()).not.toBeNull());
    await userEvent.click(content());
    await userEvent.keyboard(' THROW');
    await userEvent.click(pane.querySelector<HTMLElement>('[data-testid="taskList.edit.cancel"]')!);
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);

    // ...so what Save wrote survived and what Cancel discarded did not.
    rows()[0].click();
    await waitFor(async () => expect(description()).not.toBeNull());
    await waitFor(async () => expect(text()).toContain('KEEP'));
    await expect(text()).not.toContain('THROW');
  },
};

/**
 * Creating with a description: the pane's description field is present with nothing selected, and
 * what is typed into it reaches `onTaskCreate` as part of the same draft as the title.
 */
export const TestCreateWithDescription: Story = {
  args: { showGroupLabels: false, showDescriptions: true },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    // Nothing selected, and the field is there anyway — a new task can be given a description.
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(description()).not.toBeNull());
    const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;
    await waitFor(async () => expect(content()).not.toBeNull());

    // Type the description FIRST, then the title, and create from the title with Enter — the field
    // is still held open at that point, so the create is what has to commit it.
    const before = rows().length;
    await userEvent.click(content());
    await userEvent.keyboard('Roast it twice');
    await userEvent.click(title());
    await userEvent.keyboard('New task{Enter}');

    await waitFor(async () => expect(rows()).toHaveLength(before + 1));
    // Found by title, not by position: the list groups by status, so a new todo lands in its group
    // rather than at the end.
    const created = rows().find((row) => row.textContent?.includes('New task'));
    await expect(created).not.toBeUndefined();
    await expect(created!.textContent).toContain('Roast it twice');

    // ...and the pane resets, so the next task does not inherit the last one's description. The
    // field is not empty-stringed: CodeMirror paints the placeholder inside `.cm-content`.
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(content().textContent).not.toContain('Roast it twice'));
  },
};

/**
 * A description typed while creating, then abandoned by selecting a row, must not ride along into
 * the NEXT task created. The field remounts empty on the way back, but committing an already-empty
 * field never calls back — so the mirror the create reads has to be cleared with the selection.
 */
export const TestAbandonedDescriptionDoesNotLeak: Story = {
  args: { showGroupLabels: false, showDescriptions: true },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    await waitFor(async () => expect(content()).not.toBeNull());

    // Type a description with no title, then commit it by leaving the field — nothing is created,
    // but the create row's mirror now holds the text.
    await userEvent.click(content());
    await userEvent.keyboard('LEAKED');
    await userEvent.click(title());

    // Select a row and come back out: the pane is creating again, with an empty field.
    const first = rows()[0];
    first.click();
    await waitFor(async () => expect(title().value).not.toEqual(''));
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(async () => expect(title().value).toEqual(''));

    // Create with a title alone. The abandoned description must not be attached to it.
    const before = rows().length;
    await userEvent.click(title());
    await userEvent.keyboard('Clean task{Enter}');
    await waitFor(async () => expect(rows()).toHaveLength(before + 1));
    const created = rows().find((row) => row.textContent?.includes('Clean task'));
    await expect(created).not.toBeUndefined();
    await expect(created!.textContent).not.toContain('LEAKED');
  },
};

/**
 * With `showDescription` off the pane is title-only, even for a selected task the list can update —
 * which is what a host with no room for a markdown field (the chat strip) renders.
 */
export const TestEditWithoutDescription: Story = {
  args: { showGroupLabels: false, showDescription: false },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    const first = rows()[0];
    const firstTitle = first.querySelector('.truncate')!.textContent;
    first.click();

    // The task IS selected — the title proves the pane followed the selection — and the description
    // is still absent, so its absence is the prop and not a pane that failed to select.
    await waitFor(async () => expect(title().value).toEqual(firstTitle));
    await expect(description()).toBeNull();

    // Editing still works without it: the pane is title-only, not read-only.
    await userEvent.click(title());
    await userEvent.keyboard(' EDITED');
    await userEvent.tab();
    await waitFor(async () => expect(first.textContent).toContain('EDITED'));
  },
};

/**
 * Status grouping reorders rows against the set's array, so the gutter has to number what is on
 * screen: 1..N from the top, with no gaps and nothing out of sequence.
 */
export const TestOrdinalsAreLinear: Story = {
  args: { many: true, showOrdinals: true },
  play: async ({ canvasElement }) => {
    const ordinals = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')).map(
        (row) => row.querySelector('.tabular-nums')?.textContent ?? '',
      );

    await waitFor(async () => expect(ordinals().length).toBeGreaterThan(1));
    // Built from the count rather than hardcoded, so the seed can grow without editing the test.
    const expected = ordinals().map((_, index) => String(index + 1));
    await expect(ordinals()).toEqual(expected);
  },
};

export const TestHierarchy: Story = {
  // Descriptions on, so the alignment between a sub-task's description and its title is asserted.
  args: { hierarchical: true, showOrdinals: true, showDescriptions: true, framed: false },
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

    // Ordinals run 1..N down the list as rendered, not by position in the set's array — the walk
    // interleaves the two branches, so the two orders differ.
    await expect(rows().map(({ ordinal }) => ordinal)).toEqual(['1', '2', '3', '4', '5', '6', '7']);

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

    // The pane carries its own columns rather than the list's: it is a card below the list, so it
    // has no ordinal gutter and does not step in with the tree. Only its own two cells line up.
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const paneInput = create.querySelector('input')!.getBoundingClientRect();
    await expect(Math.round(paneInput.left)).toBeGreaterThan(Math.round(create.getBoundingClientRect().left));

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
  args: { framed: false },
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
    // The pane is one grid whose first cells ARE the title line, so its gutter cell is its first
    // child — the same column a row's status toggle occupies.
    const createIcon = create.firstElementChild;
    if (!rowIcon || !createIcon) {
      throw new Error('Row icons not found.');
    }

    // Same icon column ⇒ same horizontal centre (sub-pixel tolerance for rounding).
    await expect(Math.abs(center(rowIcon) - center(createIcon))).toBeLessThan(1);
    // ...and the labels start at the same x.
    await expect(
      Math.abs(row.children[1].getBoundingClientRect().left - create.children[1].getBoundingClientRect().left),
    ).toBeLessThan(1);

    // The row spans the full width, so trailing actions sit at the far edge.
    await expect(row.getBoundingClientRect().width).toBeGreaterThan(create.getBoundingClientRect().width * 0.9);
  },
};
