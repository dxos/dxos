//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useThemeContext } from '@dxos/react-ui';
import { attentionSurface, mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { EditorToolbar, useEditorToolbarState } from '..';
import {
  type EditorInputMode,
  decorateMarkdown,
  createMarkdownExtensions,
  formattingKeymap,
  useFormattingState,
  createBasicExtensions,
  createThemeExtensions,
  InputModeExtensions,
  type EditorViewMode,
} from '../../extensions';
import { useTextEditor, type UseTextEditorProps } from '../../hooks';
import translations from '../../translations';

type StoryProps = { placeholder?: string } & UseTextEditorProps;

const DefaultStory = ({ autoFocus, initialValue, placeholder }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const toolbarState = useEditorToolbarState({ viewMode: 'source' });
  const viewMode = toolbarState.viewMode;
  const trackFormatting = useFormattingState(toolbarState);
  // TODO(wittjosiah): Provide way to change the input mode.
  const [editorInputMode, _setEditorInputMode] = useState<EditorInputMode>('default');
  const { parentRef, view } = useTextEditor(
    () => ({
      autoFocus,
      initialValue,
      moveToEndOfLine: true,
      extensions: [
        editorInputMode ? InputModeExtensions[editorInputMode] : [],
        createBasicExtensions({ placeholder, lineWrapping: true, readOnly: viewMode === 'readonly' }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        viewMode === 'source' ? [] : decorateMarkdown(),
        formattingKeymap(),
        trackFormatting,
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
      {toolbarState && <EditorToolbar state={toolbarState} getView={getView} viewMode={handleViewModeChange} />}
      <div role='none' className='grow overflow-hidden'>
        <div className={attentionSurface} ref={parentRef} />
      </div>
    </div>
  );
};

export const Default = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    initialValue: '# Demo\n\nThis is a document.\n\n',
  },
};

export default {
  title: 'ui/react-ui-editor/EditorToolbar',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations, layout: 'fullscreen' },
};
