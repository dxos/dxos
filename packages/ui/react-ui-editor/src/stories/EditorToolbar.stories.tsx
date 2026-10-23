//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MenuBuilder, TOOLBAR_OVERFLOW_ID } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  formattingKeymap,
} from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { translations } from '#translations';

import { EDITOR_TOOLBAR_INSERT_GROUP, Editor } from '../components/index.ts';
import { type UseTextEditorProps } from '../hooks/index.ts';

type StoryArgs = { placeholder?: string; viewMode?: EditorViewMode; extended?: boolean } & UseTextEditorProps;

/** What a consumer adds without owning the toolbar: an insert action in the editor's insert group, and a menu item. */
const consumerActions = Atom.make(() =>
  MenuBuilder.make()
    .subgraph(
      MenuBuilder.extend(EDITOR_TOOLBAR_INSERT_GROUP, (group) =>
        group.action(
          'column',
          { label: 'Start next column', icon: 'ph--columns--regular', testId: 'editor.toolbar.column' },
          () => {},
        ),
      ),
    )
    .subgraph(
      MenuBuilder.extend(TOOLBAR_OVERFLOW_ID, (group) =>
        group.action('export', { label: 'Export', icon: 'ph--export--regular' }, () => {}),
      ),
    )
    .build(),
);

const DefaultStory = ({ autoFocus, initialValue, placeholder, viewMode = 'source', extended }: StoryArgs) => {
  const themeMode = Hooks.useThemeMode();

  const extensions = useMemo(
    () => [
      createBasicExtensions({
        placeholder,
        lineWrapping: true,
        readOnly: viewMode === 'readonly',
        search: true,
      }),
      createThemeExtensions({
        themeMode,
        syntaxHighlighting: true,
        slots: documentSlots,
      }),
      createMarkdownExtensions(),
      viewMode === 'source' ? [] : decorateMarkdown(),
      formattingKeymap(),
    ],
    [viewMode, themeMode, placeholder],
  );

  return (
    <Editor.Root extensions={extensions} viewMode={viewMode}>
      <Editor.Content>
        <Editor.Toolbar classNames='dx-document' customActions={extended ? consumerActions : undefined} />
        <div className='dx-expand dx-document dx-base-surface'>
          <Editor.View autoFocus={autoFocus} initialValue={initialValue} selectionEnd />
        </div>
      </Editor.Content>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/EditorToolbar',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    initialValue: '# Demo\n\nThis is a **document**.\n\n',
  },
};

/** A consumer extends the editor's insert group and the overflow menu. */
export const Extended: Story = {
  args: { ...Default.args, extended: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('editor.toolbar.column')).toBeVisible());
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
  },
};
