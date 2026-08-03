//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren, useCallback, useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { getSpace, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { TaskList, type TaskPatch } from '@dxos/react-ui-task';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { OutlineArticle } from './OutlineArticle';

const ITEM = 'Review pricing page';
const RENAMED = 'Revise pricing tiers';

const CONTENT = trim`
  - [ ] Draft the launch announcement
  - [ ] ${ITEM}
    - [ ] Collect competitor quotes
    - [ ] Update the FAQ
  - [ ] Schedule the retro
`;

type DefaultStoryProps = {
  content?: string;
  name?: string;
};

const DefaultStory = ({ content, name }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const outline = useMemo(() => space && space.db.add(Outline.make({ name, content })), [space, name, content]);
  if (!outline?.content.target) {
    return null;
  }

  return (
    <div className='dx-container grid grid-cols-3 gap-3 p-3'>
      <Column>
        <OutlineArticle role='article' subject={outline} attendableId='story' />
      </Column>
      <Column>
        <SourceView text={outline.content.target} />
      </Column>
      <Column>
        <TaskSetView outline={outline} />
      </Column>
    </div>
  );
};

const Column = ({ children }: PropsWithChildren) => (
  <div className='dx-expander border border-separator rounded-md overflow-hidden'>{children}</div>
);

/**
 * The durable side of the outline: the tasks promoted out of it, which the outliner files into a
 * lazily created `TaskSet`. Nothing renders until the first conversion creates that set.
 */
const TaskSetView = ({ outline }: { outline: Outline.Outline }) => {
  const space = getSpace(outline);
  // The set is created on the first conversion, so resolve the ref reactively rather than reading
  // `.target` once.
  const [taskSet] = useObject(outline.taskSet);
  // Membership is the parent edge, but `children()` does not re-emit when a child's own property
  // changes — so a task renamed through the form would not update here. Query by type and filter
  // by parent instead.
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const filtered = useMemo(
    () => (taskSet ? tasks.filter((task) => Obj.getParent(task)?.id === taskSet.id) : []),
    [tasks, taskSet],
  );

  const handleCreate = useCallback(
    (title: string) => {
      if (space) {
        void Outline.createTask(outline, space.db, title);
      }
    },
    [outline, space],
  );

  const handleUpdate = useCallback((task: Task.Task, patch: TaskPatch) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
  }, []);

  const handleDelete = useCallback(
    (task: Task.Task) => {
      space?.db.remove(task);
    },
    [space],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar />
      <Panel.Content>
        <TaskList
          tasks={filtered}
          onTaskCreate={handleCreate}
          onTaskUpdate={handleUpdate}
          onTaskDelete={handleDelete}
        />
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
  const pane = canvasElement.querySelector<HTMLElement>('[aria-label="Tasks"]');
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
