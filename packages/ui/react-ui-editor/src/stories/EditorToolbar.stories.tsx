//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { EditorToolbar, useEditorToolbar } from '../components';
import { editorWidth } from '../defaults';
import {
  InputModeExtensions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  formattingListener,
} from '../extensions';
import { type UseTextEditorProps, useTextEditor } from '../hooks';
import { translations } from '../translations';
import { type EditorInputMode, type EditorViewMode } from '../types';

type StoryProps = { placeholder?: string } & UseTextEditorProps;

const DefaultStory = ({ autoFocus, initialValue, placeholder }: StoryProps) => {
  const { themeMode } = useThemeContext();

  const toolbarState = useEditorToolbar({ viewMode: 'source' });
  const viewMode = toolbarState.viewMode;
  // TODO(wittjosiah): Provide way to change the input mode.
  const [editorInputMode, _setEditorInputMode] = useState<EditorInputMode>('default');
  const { parentRef, view } = useTextEditor(
    () => ({
      autoFocus,
      initialValue,
      selectionEnd: true,
      extensions: [
        editorInputMode ? InputModeExtensions[editorInputMode] : [],
        createBasicExtensions({ placeholder, lineWrapping: true, readOnly: viewMode === 'readonly', search: true }),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        viewMode === 'source' ? [] : decorateMarkdown(),
        formattingKeymap(),
        formattingListener(() => toolbarState),
      ],
    }),
    [editorInputMode, viewMode, themeMode, placeholder],
  );

  const getView = useCallback(() => {
    invariant(view);
    return view;
  }, [view]);

  const handleViewModeChange = useCallback((mode: EditorViewMode) => {
    toolbarState.viewMode = mode;
  }, []);

  // TODO(marijn): This doesn't update the state on view changes.
  //  Also not sure if view is even guaranteed to exist at this point.
  return (
    <div role='none' className={mx('fixed inset-0 flex flex-col')}>
      {toolbarState && <EditorToolbar state={toolbarState} getView={getView} onViewModeChange={handleViewModeChange} />}
      <div role='none' className={mx('grow overflow-hidden', attentionSurface)}>
        <div className={mx(editorWidth)} ref={parentRef} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/EditorToolbar',
  render: DefaultStory,
  decorators: [withTheme],
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
