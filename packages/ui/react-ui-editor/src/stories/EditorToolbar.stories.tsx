//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
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

import { Editor } from '../components';
import { type UseTextEditorProps } from '../hooks';

type DefaultStoryProps = { placeholder?: string; viewMode?: EditorViewMode } & UseTextEditorProps;

const DefaultStory = ({ autoFocus, initialValue, placeholder, viewMode = 'source' }: DefaultStoryProps) => {
  const { themeMode } = useThemeContext();

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
        <Editor.Toolbar classNames='dx-document' />
        <div role='none' className='dx-container dx-document bg-base-surface'>
          <Editor.View autoFocus={autoFocus} initialValue={initialValue} selectionEnd />
        </div>
      </Editor.Content>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/EditorToolbar',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen', classNames: 'bg-sidebar-surface' })],
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
