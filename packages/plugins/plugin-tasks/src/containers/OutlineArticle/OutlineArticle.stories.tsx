//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren, useCallback, useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { createMenuAction } from '@dxos/react-ui-menu';
import { TaskList } from '@dxos/react-ui-task';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { OutlineArticle } from './OutlineArticle.tsx';

const ITEM = 'Review pricing page';
const RENAMED = 'Revise pricing tiers';

const CONTENT = trim`
  - [ ] Draft the launch announcement
  - [ ] ${ITEM}
    - [ ] Collect competitor quotes
    - [ ] Update the FAQ
  - [ ] Schedule the retro
`;

type StoryArgs = {
  content?: string;
  name?: string;
};

const DefaultStory = ({ content, name }: StoryArgs) => {
  const [space] = useSpaces();
  const outline = useMemo(() => space && space.db.add(Outline.make({ name, content })), [space, name, content]);
  // An outline owns no task set — promotion files into the ledger of whatever embeds it — so the
  // story plays the embedder and supplies one. Passing `undefined` instead is the degraded case:
  // the outline renders with no convert affordance at all.
  const taskSet = useMemo(() => space && space.db.add(TaskSet.make({ name: 'Story tasks' })), [space]);
  if (!outline?.content.target) {
    return null;
  }

  return (
    <div className='dx-expand grid grid-cols-3 gap-3 p-3'>
      <Column>
        <OutlineArticle role='article' subject={outline} taskSet={taskSet} attendableId='story' />
      </Column>
      <Column>
        <SourceView text={outline.content.target} />
      </Column>
      <Column>
        <TaskSetView outline={outline} taskSet={taskSet} />
      </Column>
    </div>
  );
};

const Column = ({ children }: PropsWithChildren) => (
  <div className='dx-expand border border-separator rounded-md overflow-hidden'>{children}</div>
);

/**
 * The durable side of the outline: the tasks promoted out of it, which the outliner files into the
 * task set the embedder supplied.
 */
const TaskSetView = ({ outline, taskSet }: { outline: Outline.Outline; taskSet?: TaskSet.TaskSet }) => {
  const db = Obj.getDatabase(outline);
  // Queried by type and filtered to the set's members: `useQuery` re-emits on membership changes
  // but not on a member's property change, and the form edits titles in place.
  const tasks = useQuery(db, Filter.type(Task.Task));
  const filtered = useMemo(() => {
    const members = new Set(taskSet?.tasks.map((ref) => ref.target?.id));
    return tasks.filter((task) => members.has(task.id));
  }, [tasks, taskSet]);

  const handleCreate = useCallback(
    ({ title, ...props }: Task.Draft) => {
      if (db && taskSet) {
        TaskSet.addTask(db, taskSet, title, props);
      }
    },
    [db, taskSet],
  );

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
  }, []);

  const handleDelete = useCallback(
    (task: Task.Task) => {
      db?.remove(task);
    },
    [db],
  );

  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: 'Delete task',
        icon: 'ph--x--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [handleDelete],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar />
      <Panel.Content>
        <TaskList.Root
          tasks={filtered}
          onTaskCreate={handleCreate}
          onTaskUpdate={handleUpdate}
          getTaskActions={getTaskActions}
        >
          <TaskList.Content />
          <TaskList.Edit grid />
        </TaskList.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/** Editable plain-markdown view of the same text, without the outliner extension. */
const SourceView = ({ text }: { text: Text.Text }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      id: `${text.id}-source`,
      initialValue: text.content,
      extensions: [
        createDataExtensions({ id: text.id, text: Doc.createAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false, lineWrapping: true }),
        createThemeExtensions({ themeMode }),
      ],
    }),
    [text, themeMode],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar />
      <Panel.Content asChild>
        <div ref={parentRef} className='overflow-auto text-sm p-trim-md' />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/OutlineArticle',
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The article reads `MarkdownCapabilities.ExtensionProvider` for its editor's contributed
    // extensions, which needs a plugin manager; nothing here contributes any, which is the point —
    // the outline builds the same editor with an empty list.
    withPluginManager({ plugins: corePlugins() }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Outline.Outline, Task.Task, TaskSet.TaskSet],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory content={CONTENT} name='Launch plan' />,
};

export const Empty: Story = {
  render: () => <DefaultStory />,
};

/**
 * Drives the whole arc: convert an item, open the task it created, rename it, and come back to an
 * outline whose link text has followed the rename.
 */
export const ConvertToTask: Story = {
  render: () => <DefaultStory content={CONTENT} name='Launch plan' />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The client/space initialize well past testing-library's default 1s timeout.
    await canvas.findByText(ITEM, {}, { timeout: 10_000 });
    placeCaret(canvasElement, ITEM);

    await userEvent.click(canvas.getByRole('button', { name: 'Convert to task' }));

    // The item is now a bullet carrying a link chip, and the document holds a markdown link.
    const chip = await canvas.findByRole('button', { name: ITEM }, { timeout: 10_000 });
    await waitFor(() => expect(sourceText(canvasElement)).toMatch(new RegExp(`- \\[${ITEM}\\]\\(echo://`)));

    // A converted item carries an anchor chip; its line must stay the same height as its plain
    // neighbours (the chip's vertical padding is cancelled by a negative margin).
    await waitFor(() => {
      const lines = [...canvasElement.querySelectorAll('.cm-content')][0].querySelectorAll('.cm-line');
      const chipLine = [...lines].find((line) => line.querySelector('dx-anchor'));
      invariant(chipLine, 'No line carries the anchor chip.');
      // Against the shortest plain line, not the tallest: the longest item soft-wraps to two line
      // boxes at this column width, which says nothing about the chip.
      const plain = [...lines]
        .filter((line) => line !== chipLine)
        .map((line) => line.getBoundingClientRect().height)
        .filter((height) => height > 0);
      return expect(Math.abs(chipLine.getBoundingClientRect().height - Math.min(...plain))).toBeLessThan(1);
    });

    // The promoted task appears in the durable task list (third column), proving the outliner
    // filed it into the outline's task set.
    await waitFor(() => expect(within(taskListPane(canvasElement)).getByText(ITEM)).toBeTruthy());

    // The chip opens the task in place, with a back button in the toolbar.
    await userEvent.click(chip);
    const title = await canvas.findByDisplayValue(ITEM, {}, { timeout: 10_000 });

    // Renaming the task reconciles the document's link text, which is not edited directly.
    await userEvent.clear(title);
    await userEvent.type(title, RENAMED);
    await userEvent.click(canvas.getByRole('button', { name: 'Back to outline' }));

    await canvas.findByRole('button', { name: RENAMED }, { timeout: 10_000 });
    await waitFor(() => expect(sourceText(canvasElement)).toMatch(new RegExp(`- \\[${RENAMED}\\]\\(echo://`)));

    // The task list tracks the rename too — a property change, which is why it queries by type
    // and filters by parent rather than using a `children()` query.
    await waitFor(() => expect(within(taskListPane(canvasElement)).getByText(RENAMED)).toBeTruthy());
  },
};

/** The task-list pane (third column); re-queried per assertion since React may replace the node. */
const taskListPane = (canvasElement: HTMLElement): HTMLElement => {
  // By accessible name, not `aria-label`: the tree is named through the machine's own `Label` part,
  // which it points `aria-labelledby` at.
  const pane = within(canvasElement).queryByRole('tree', { name: 'Tasks' });
  invariant(pane, 'Task list not found.');
  return pane;
};

/** Raw markdown from the source pane (the last editor), which mirrors the outline's text object. */
const sourceText = (canvasElement: HTMLElement): string => {
  const editors = canvasElement.querySelectorAll('.cm-content');
  return editors.length > 0 ? (editors[editors.length - 1].textContent ?? '') : '';
};

/**
 * Put the caret on the item containing `text` (the outline is the first editor).
 * Driven through the editor rather than a click: CodeMirror derives the selection from real pointer
 * coordinates, which `userEvent` does not supply, so a synthetic click leaves the caret where it was.
 */
const placeCaret = (canvasElement: HTMLElement, text: string): void => {
  const content = canvasElement.querySelector<HTMLElement>('.cm-content');
  const view = content && EditorView.findFromDOM(content);
  invariant(view, 'Missing editor.');
  const index = view.state.doc.toString().indexOf(text);
  invariant(index >= 0, `Missing item: ${text}`);
  view.dispatch({ selection: EditorSelection.cursor(index) });
};
