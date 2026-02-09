//
// Copyright 2024 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import {
  type EditorInputMode,
  type EditorViewMode,
  InputModeExtensions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  formattingKeymap,
  formattingListener,
} from '@dxos/ui-editor';
import { attentionSurface, mx } from '@dxos/ui-theme';

import { EditorToolbar, type EditorToolbarState, useEditorToolbar } from '../components';
import { type UseTextEditorProps, useTextEditor } from '../hooks';
import { translations } from '../translations';

type StoryProps = { placeholder?: string } & UseTextEditorProps;

const DefaultStory = ({ autoFocus, initialValue, placeholder }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const registry = useContext(RegistryContext);

  const toolbarState = useEditorToolbar({ viewMode: 'source' });
  const { viewMode } = useAtomValue(toolbarState);

  const updateToolbarState = useCallback(
    (formatting: EditorToolbarState) => {
      registry.update(toolbarState, (state) => ({ ...state, ...formatting }));
    },
    [registry, toolbarState],
  );

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
        formattingListener(updateToolbarState),
      ],
    }),
    [editorInputMode, viewMode, themeMode, placeholder],
  );

  const getView = useCallback(() => {
    invariant(view);
    return view;
  }, [view]);

  const handleViewModeChange = useCallback(
    (mode: EditorViewMode) => {
      registry.update(toolbarState, (state) => ({ ...state, viewMode: mode }));
    },
    [registry, toolbarState],
  );

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
  decorators: [withRegistry, withTheme],
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
