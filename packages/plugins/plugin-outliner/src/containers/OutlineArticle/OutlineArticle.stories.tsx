//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { translations } from '#translations';

import { OutlineArticle } from './OutlineArticle';

const ITEM = 'Review pricing page';
const RENAMED = 'Revise pricing tiers';

const CONTENT = [
  '- [ ] Draft the launch announcement',
  `- [ ] ${ITEM}`,
  '  - [ ] Collect competitor quotes',
  '  - [ ] Update the FAQ',
  '- [ ] Schedule the retro',
].join('\n');

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
    <div className='dx-container grid grid-cols-2 gap-3 p-3'>
      <div className='dx-expander border border-separator rounded-md overflow-hidden'>
        <OutlineArticle role='article' subject={outline} attendableId='story' />
      </div>
      <div className='dx-expander border border-separator rounded-md overflow-hidden'>
        <SourceView text={outline.content.target} />
      </div>
    </div>
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
  title: 'plugins/plugin-outliner/containers/OutlineArticle',
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

    // The chip opens the task in place, with a back button in the toolbar.
    await userEvent.click(chip);
    const title = await canvas.findByDisplayValue(ITEM, {}, { timeout: 10_000 });

    // Renaming the task reconciles the document's link text, which is not edited directly.
    await userEvent.clear(title);
    await userEvent.type(title, RENAMED);
    await userEvent.click(canvas.getByRole('button', { name: 'Back to outline' }));

    await canvas.findByRole('button', { name: RENAMED }, { timeout: 10_000 });
    await waitFor(() => expect(sourceText(canvasElement)).toMatch(new RegExp(`- \\[${RENAMED}\\]\\(echo://`)));
  },
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
