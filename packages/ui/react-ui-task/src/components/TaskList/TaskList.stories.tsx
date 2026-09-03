//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Obj, Ref } from '@dxos/echo';
import { random } from '@dxos/random';
import { createMenuAction } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { translations } from '#translations';

import { type TaskPlacement } from './hierarchy';
import { TaskList } from './TaskList';

random.seed(1);

const seedFlat = (): Task.Task[] => [
  Task.make({
    title: 'Source green coffee',
    status: 'done',
    priority: 'high',
    description:
      'Two Ethiopian lots and one Colombian, sampled before committing to a full bag. Supplier list: https://example.com/suppliers',
  }),
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
/** A value when `set`, `undefined` otherwise. */
const when = <T,>(set: boolean, value: () => T): T | undefined => (set ? value() : undefined);

/**
 * Every optional field is left unset on some rows: each renders a control whether or not it holds a
 * value, so a seed that fills them all leaves the unset half of the list — the dot, the blank
 * description — with no story behind it.
 *
 * Which rows is a rule on the index rather than a coin flip: a flip can land the same way forty
 * times, and a story that only sometimes covers the state it exists for is not coverage. The moduli
 * differ per field so a row is rarely all-set or all-empty.
 */
const seedMany = (n = 40): Task.Task[] =>
  Array.from({ length: n }, (_, index) =>
    Task.make({
      title: random.lorem.sentence(random.number.int({ min: 5, max: 10 })),
      description: when(index % 2 === 0, () => random.lorem.paragraphs(1)),
      priority: when(index % 3 !== 0, () => random.helpers.arrayElement([...Task.Priority.literals])),
      estimate: when(index % 2 === 1, () => random.helpers.arrayElement([...Task.Estimate.literals])),
    }),
  );

/**
 * A full tree: every node down to `depth` has `children` sub-tasks, so the seed exercises what a
 * two-level fixture cannot — indentation compounding past the second level, a branch under a
 * branch under a branch, and enough rows at each depth to see the columns hold. Titles carry the
 * path (`2.1.3`) so a row's depth can be read off it without counting pixels, and the leaf rows
 * are listed depth-first so array order and tree order agree.
 */
const seedDeepHierarchy = (depth = 3, children = 3): Task.Task[] => {
  const tasks: Task.Task[] = [];
  const statuses: Task.Status[] = ['todo', 'started', 'done'];
  const visit = (parent: Task.Task | undefined, path: number[]) => {
    const task = Task.make({
      title: `Task ${path.join('.')} — ${random.lorem.words(random.number.int({ min: 2, max: 5 }))}`,
      status: statuses[(path.length + path[path.length - 1]) % statuses.length],
      description: when(path[path.length - 1] === 2, () => random.lorem.sentence()),
      estimate: when(path.length === depth, () => random.helpers.arrayElement([...Task.Estimate.literals])),
      ...(parent && { parentTask: Ref.make(parent) }),
    });
    tasks.push(task);
    if (path.length < depth) {
      for (let index = 1; index <= children; index++) {
        visit(task, [...path, index]);
      }
    }
  };
  for (let index = 1; index <= children; index++) {
    visit(undefined, [index]);
  }
  return tasks;
};

/**
 * Two roots with sub-tasks two levels deep. Array order is sibling order only, so the seed
 * deliberately interleaves the two branches — a list that walked the array instead of the tree
 * would render them out of order, which is the bug this story exists to catch.
 */
const seedHierarchy = (): Task.Task[] => {
  const task1 = Task.make({
    title: 'Ship the spring release',
    status: 'started',
    priority: 'high',
  });
  const task2 = Task.make({
    title: 'Dial in the roast',
    status: 'todo',
  });
  const task3 = Task.make({
    title: 'Write the tasting notes',
    status: 'todo',
    parentTask: Ref.make(task1),
    description: 'One paragraph per lot, in the order they are poured.',
  });
  const task4 = Task.make({
    title: 'Sample the Ethiopian lots',
    status: 'done',
    parentTask: Ref.make(task2),
  });
  const task5 = Task.make({
    title: 'Approve the label art',
    status: 'todo',
    parentTask: Ref.make(task1),
  });
  const task6 = Task.make({
    title: 'Log every profile',
    status: 'started',
    parentTask: Ref.make(task2),
  });
  const task7 = Task.make({
    title: 'Proofread the back label',
    status: 'todo',
    parentTask: Ref.make(task5),
  });

  return [task1, task2, task3, task4, task5, task6, task7];
};

/**
 * The minimal shape the drop zones are reasoned about with: one parent and two children. Dragging
 * `C` leaves `A > B`, against which every landing place has to be reachable.
 */
const seedDrag = (): Task.Task[] => {
  const a = Task.make({ title: 'A', status: 'todo' });
  const b = Task.make({ title: 'B', status: 'todo', parentTask: Ref.make(a) });
  const c = Task.make({ title: 'C', status: 'todo', parentTask: Ref.make(a) });
  return [a, b, c];
};

const DefaultStory = ({
  seed = seedFlat,
  readonly,
  draggable = false,
  checkable = false,
  hierarchical,
  groupByStatus,
  showGroupLabels,
  showOrdinals,
  showDescription = true,
  showEstimates,
  debug,
  framed = true,
}: {
  /**
   * The tasks to start from. A factory rather than a named fixture, so a story can compose its own
   * (`() => seedMany(100)`) without a union to extend — and because `useState` reads its initial
   * value once, which is what made the booleans this replaces useless as live controls.
   */
  seed?: () => Task.Task[];
  readonly?: boolean;
  /** Wire `onTaskMove`, which is what turns rows into drag sources. Off unless a story asks. */
  draggable?: boolean;
  /** Wire `onTaskCheck`, which puts a checkbox in the gutter where the ordinal would sit. */
  checkable?: boolean;
  hierarchical?: boolean;
  /** Group tasks under status headers. */
  groupByStatus?: boolean;
  showGroupLabels?: boolean;
  showOrdinals?: boolean;
  showDescription?: boolean;
  showEstimates?: boolean;
  /** Paint every row's drop bands, so the zones are visible without holding a drag. */
  debug?: boolean;
  /** Insets the pane in a card, as an article does. Off for the tests that measure the pane's own
      columns against a row's, which the inset would offset. */
  framed?: boolean;
}) => {
  const [tasks, setTasks] = useState<Task.Task[]>(seed);

  // Selection is what the article wires, and what arrow-key navigation moves.
  const [selected, setSelected] = useState<string>();

  // The checked set stands in for the view state the article keys by task-set id: a set of its own,
  // so a row can be current and checked at once.
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set<string>());
  const handleCheck = useCallback((task: Task.Task) => {
    setChecked((checked) => {
      const next = new Set(checked);
      next.has(task.id) ? next.delete(task.id) : next.add(task.id);
      return next;
    });
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

  const handleCreate = useCallback(({ title, ...props }: Task.Draft) => {
    setTasks((tasks) => [...tasks, Task.make({ title, status: 'todo', ...props })]);
  }, []);

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
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
      debug={debug}
      tasks={tasks}
      selected={selected}
      hierarchical={hierarchical}
      groupByStatus={groupByStatus}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescription={showDescription}
      showEstimates={showEstimates}
      getTaskActions={readonly ? undefined : getTaskActions}
      onTaskCreate={readonly ? undefined : handleCreate}
      onTaskUpdate={readonly ? undefined : handleUpdate}
      checked={checked}
      onTaskCheck={checkable ? handleCheck : undefined}
      onTaskMove={readonly || !hierarchical || !draggable ? undefined : handleMove}
      onTaskSelect={(task) => setSelected(task?.id)}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      {framed ? (
        <div className='p-2'>
          <TaskList.Edit
            showDescription={showDescription}
            classNames='bg-input-surface border border-separator rounded-md p-2'
          />
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
export const ManyTasks: Story = {
  args: {
    seed: seedMany,
    showEstimates: true,
    showDescription: true,
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

/** The gutter's checkbox: the set an action acts on, in place of the ordinal that would sit there. */
export const WithCheckboxes: Story = {
  args: {
    checkable: true,
    showGroupLabels: false,
  },
};

export const WithDescriptions: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
    showDescription: true,
  },
};

export const Hierarchical: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    showDescription: true,
  },
};

/** Three levels of three: indentation past the second level, and the columns holding at every depth. */
export const DeepHierarchy: Story = {
  args: {
    seed: () => seedDeepHierarchy(3, 3),
    hierarchical: true,
    showOrdinals: true,
    showEstimates: true,
    showDescription: true,
  },
};

/** Rows are drag sources: `onTaskMove` is wired, so the tree publishes each row to pragmatic-dnd. */
export const HierarchicalDraggable: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showDescription: true,
  },
};

/** The drop bands painted on every row, so the zones can be seen without holding a drag. */
export const DragDebug: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showOrdinals: true,
    showDescription: true,
    debug: true,
    framed: false,
  },
};

/**
 * The minimal `A > B, C` shape TREE.md reasons the six landing places about, with the bands painted.
 * Small enough that every zone is reachable without scrolling, which is what makes it the fixture to
 * check a hitbox change against.
 */
export const DropZones: Story = {
  args: {
    seed: seedDrag,
    hierarchical: true,
    draggable: true,
    showDescription: false,
    debug: true,
    framed: false,
  },
};

/**
 * Status groups rendered through the tree: headers are `disposition: 'group'` nodes, spliced out of
 * the collection's topology so the keyboard never lands on one.
 */
export const GroupedTree: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    groupByStatus: true,
    showGroupLabels: true,
    showOrdinals: true,
  },
};

/**
 * The status glyph spins for a task an agent has taken and started — and only then.
 *
 * Both halves matter: `started` alone is a person working, and an agent assignee alone is work that
 * is queued. The seed carries one of each, so a rule that dropped either half fails here.
 */
export const TestAgentSpinner: Story = {
  args: {
    showGroupLabels: false,
  },
  play: async ({ canvasElement }) => {
    const spinning = () =>
      [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')]
        .filter((row) => row.querySelector('[data-testid="taskList.item.status"] .animate-spin'))
        .map((row) => row.querySelector('span.truncate')?.textContent ?? '');

    await waitFor(async () => expect(spinning()).toEqual(['Draft launch email']), { timeout: 10_000 });
  },
};

/**
 * Checking is selection, not a status write, and it is not the current row either: the box toggles
 * independently of which row the reader is on, and leaves the task's status alone.
 */
export const TestCheckboxSelection: Story = {
  args: {
    checkable: true,
    showGroupLabels: false,
    showOrdinals: true,
  },
  play: async ({ canvasElement }) => {
    const boxes = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.checkbox"]'));
    const statuses = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.status"]')).map(
        (status) => status.querySelector('.sr-only')?.textContent,
      );

    await waitFor(async () => expect(boxes().length).toBeGreaterThan(1));
    // Checkbox and ordinal are mutually exclusive: the box takes the gutter cell, so no row numbers.
    await expect(canvasElement.querySelectorAll('.tabular-nums').length).toBe(0);

    const before = statuses();
    await userEvent.click(boxes()[0]);
    await waitFor(async () => expect(boxes()[0].getAttribute('data-state')).toBe('checked'));
    // A second row checks alongside the first — a set, not a single selection.
    await userEvent.click(boxes()[1]);
    await waitFor(async () => expect(boxes()[1].getAttribute('data-state')).toBe('checked'));
    await expect(boxes()[0].getAttribute('data-state')).toBe('checked');

    // Selection only: checking two rows moved no task's status, which is what the status control
    // is for.
    await expect(statuses()).toEqual(before);

    // Toggles off.
    await userEvent.click(boxes()[0]);
    await waitFor(async () => expect(boxes()[0].getAttribute('data-state')).toBe('unchecked'));
  },
};

export const TestEdit: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
  },
  // The pane is the detail half: it creates when nothing is selected and edits the selection
  // otherwise, which is the whole reason editing moved out of the row.
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!pane) {
      throw new Error('Task edit pane not found.');
    }
    const title = () => {
      const input = pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]');
      if (!input) {
        throw new Error('Task edit title input not found.');
      }
      return input;
    };
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const requireDescription = () => {
      const element = description();
      if (!element) {
        throw new Error('Task description editor not found.');
      }
      return element;
    };
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
    const firstTitleElement = first.querySelector('.truncate');
    if (!firstTitleElement) {
      throw new Error('Task title element not found.');
    }
    const firstTitle = firstTitleElement.textContent;
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
    await waitFor(async () => expect(requireDescription().querySelector('.cm-content')).not.toBeNull());

    // ...and its text starts where the title's does. CodeMirror insets its own content, which would
    // otherwise sit the description further in than the field above it.
    const left = (element: Element) => Math.round(element.getBoundingClientRect().left);
    const descriptionLine = requireDescription().querySelector('.cm-line');
    if (!descriptionLine) {
      throw new Error('Description editor line not found.');
    }
    await expect(left(descriptionLine)).toEqual(left(title()));

    // Tab moves from the title into the description's TEXT. The editor otherwise puts its tab stop
    // on a wrapper that needs a further Enter to get into, so the caret was two keys away.
    title().focus();
    await userEvent.tab();
    await waitFor(async () =>
      expect(document.activeElement).toEqual(requireDescription().querySelector('.cm-content')),
    );

    // ...and Tab leaves again rather than indenting, so the field is not a trap.
    await userEvent.tab();
    await waitFor(async () => expect(requireDescription().contains(document.activeElement)).toBeFalsy());

    // Save writes the pending description and leaves, dropping the pane back to creating.
    const content = () => {
      const cmContent = requireDescription().querySelector<HTMLElement>('.cm-content');
      if (!cmContent) {
        throw new Error('Description editor content not found.');
      }
      return cmContent;
    };
    const text = () => content().textContent ?? '';
    await userEvent.click(content());
    await userEvent.keyboard(' KEEP');
    const saveButton = pane.querySelector<HTMLElement>('[data-testid="taskList.edit.save"]');
    if (!saveButton) {
      throw new Error('Task edit save button not found.');
    }
    await userEvent.click(saveButton);
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
    const cancelButton = pane.querySelector<HTMLElement>('[data-testid="taskList.edit.cancel"]');
    if (!cancelButton) {
      throw new Error('Task edit cancel button not found.');
    }
    await userEvent.click(cancelButton);
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
  args: {
    showGroupLabels: false,
    showDescription: true,
  },
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
  args: {
    showGroupLabels: false,
    showDescription: true,
  },
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
  args: {
    showGroupLabels: false,
    showDescription: false,
  },
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
  args: {
    seed: seedMany,
    showOrdinals: true,
  },
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
  // Descriptions on, so the alignment between a sub-task's description and its title is asserted;
  // draggable on, because the drag affordances are part of what this asserts.
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showOrdinals: true,
    showDescription: true,
    framed: false,
  },
  // The tree is what the walk produces, not what the array holds; and restructuring is driven from
  // the keyboard, which is the half of the gesture set that CAN be synthesized (a native HTML5 drag
  // cannot).
  play: async ({ canvasElement }) => {
    const rows = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'))
        // A collapsed branch HIDES its descendants rather than unmounting them, so presence in the
        // DOM is not visibility — the flat list dropped them from the walk instead.
        .filter((row) => !row.closest('[hidden]'))
        .map((row) => ({
          row,
          title: row.querySelector('.truncate')?.textContent ?? '',
          // A leaf IS the `treeitem`, but a branch's `treeitem` is a `display: contents` wrapper
          // around the focusable row — so the level is read from whichever of the two carries it.
          level: Number(row.closest('[role="treeitem"]')?.getAttribute('aria-level')),
          ordinal: row.querySelector('.tabular-nums')?.textContent ?? '',
        }));
    const shape = () => rows().map(({ title, level }) => `${title}:${level}`);
    const toggle = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!;
    const press = (row: HTMLElement, key: string) => {
      row.focus();
      row.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: true, bubbles: true }));
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

    // Collapsing a branch hides its descendants and marks the row. `userEvent`, not `.click()`:
    // the disclosure is a zag machine and it ignores the untrusted event a bare click dispatches.
    await userEvent.click(toggle(rows()[0].row));
    await waitFor(async () => {
      await expect(rows().map(({ title }) => title)).toEqual([
        'Ship the spring release',
        'Dial in the roast',
        'Sample the Ethiopian lots',
        'Log every profile',
      ]);
      // On the `treeitem` for the same reason as `aria-level`, not on the focusable row inside it.
      await expect(rows()[0].row.closest('[role="treeitem"]')?.getAttribute('aria-expanded')).toEqual('false');
    });
    await userEvent.click(toggle(rows()[0].row));
    await waitFor(async () => expect(rows()).toHaveLength(7));

    // Shift-ArrowLeft outdents: the sub-task becomes the next sibling of its parent.
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

    // Arrow keys step row to row. Focus, not selection: an APG tree moves the roving tabstop and
    // leaves selection to an explicit activation, where the flat listbox let selection follow
    // focus. The machine owns this now, so the assertion is on where focus landed.
    const focusedRow = () => document.activeElement?.closest('[data-testid="taskList.item"]')?.textContent;
    const secondRowTitle = rows()[1].title;
    rows()[0].row.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => expect(focusedRow()).toContain(secondRowTitle));
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(async () => expect(focusedRow()).toContain(rows()[0].title));

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

    // Each row is findable by task id. In the tree the attribute is `data-object-id`, stamped by
    // `Tree` itself — the flat row's own `data-task-id` is what its drag preview reads to collect a
    // subtree to clone, and that path is unchanged.
    await expect(canvasElement.querySelectorAll('[data-object-id]')).toHaveLength(7);

    // The pane carries its own columns rather than the list's: it is a card below the list, so it
    // has no ordinal gutter and does not step in with the tree. Only its own two cells line up.
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!create) {
      throw new Error('Task edit pane not found.');
    }
    const paneInputElement = create.querySelector('input');
    if (!paneInputElement) {
      throw new Error('Task edit pane input not found.');
    }
    const paneInput = paneInputElement.getBoundingClientRect();
    await expect(Math.round(paneInput.left)).toBeGreaterThan(Math.round(create.getBoundingClientRect().left));

    // The row itself is the drag source — the tree publishes each row to pragmatic-dnd rather than
    // a handle in the gutter, which is what the navtree does too. The drop is a native HTML5 drag
    // and cannot be driven from a play function; the manual script covers the gesture and its
    // landing places.
    await expect(canvasElement.querySelectorAll('[draggable="true"]')).toHaveLength(7);

    // The disclosure toggle sits on the title's centreline whether or not a description follows.
    for (const { row } of rows()) {
      const toggle = row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]');
      const rowTitle = row.querySelector<HTMLElement>('.truncate');
      if (toggle && rowTitle) {
        const centre = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return rect.top + rect.height / 2;
        };
        await expect(Math.abs(centre(toggle) - centre(rowTitle))).toBeLessThan(1);
      }
    }

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
  args: {
    framed: false,
  },
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

    // `:not([data-focus-sentinel])`: a focus group inserts zero-size boundary elements as its first
    // and last children, so the first *rendered* cell is not the first element child.
    const firstCell = (element: HTMLElement) => element.querySelector(':scope > *:not([data-focus-sentinel])');
    const labelCell = (element: HTMLElement) =>
      element.querySelectorAll<HTMLElement>(':scope > *:not([data-focus-sentinel])')[1];
    // A tree row leads with its disclosure toggle and carries the status control inside the
    // heading, where the pane — which has no disclosure — leads with the status column itself.
    const rowIcon = row.querySelector<HTMLElement>('[data-testid="taskList.item.status"]');
    // The pane is one grid whose first cells ARE the title line, so its gutter cell is its first
    // child — the same column a row's status toggle occupies.
    const createIcon = firstCell(create);
    const rowLabel = row.querySelector<HTMLElement>('.truncate');
    const createLabel = labelCell(create);
    // Guarded together: indexing a NodeList yields `undefined` for a missing cell, and reading
    // geometry off it would throw a TypeError instead of failing the alignment assertion.
    if (!rowIcon || !createIcon || !rowLabel || !createLabel) {
      throw new Error('Row icons or label cells not found.');
    }

    // Same icon column ⇒ same horizontal centre (sub-pixel tolerance for rounding).
    await expect(Math.abs(center(rowIcon) - center(createIcon))).toBeLessThan(1);
    // ...and the labels start at the same x.
    await expect(
      Math.abs(rowLabel.getBoundingClientRect().left - createLabel.getBoundingClientRect().left),
    ).toBeLessThan(1);

    // The row spans the full width, so trailing actions sit at the far edge.
    await expect(row.getBoundingClientRect().width).toBeGreaterThan(create.getBoundingClientRect().width * 0.9);
  },
};
