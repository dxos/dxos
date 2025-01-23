//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { Toolbar as NaturalToolbar, Select, useThemeContext } from '@dxos/react-ui';
import { attentionSurface, mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { EditorToolbar, useEditorToolbarState } from './components';
import {
  type EditorInputMode,
  decorateMarkdown,
  createMarkdownExtensions,
  formattingKeymap,
  useFormattingState,
  createBasicExtensions,
  createThemeExtensions,
  InputModeExtensions,
} from './extensions';
import { useActionHandler, useTextEditor, type UseTextEditorProps } from './hooks';
import translations from './translations';

type StoryProps = { placeholder?: string; readonly?: boolean } & UseTextEditorProps;

const DefaultStory = ({ autoFocus, initialValue, placeholder, readonly }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const toolbarState = useEditorToolbarState({ viewMode: 'source' });
  const trackFormatting = useFormattingState(toolbarState);
  const [editorInputMode, _setEditorInputMode] = useState<EditorInputMode>('default');
  const { parentRef, view } = useTextEditor(
    () => ({
      autoFocus,
      initialValue,
      moveToEndOfLine: true,
      extensions: [
        editorInputMode ? InputModeExtensions[editorInputMode] : [],
        createBasicExtensions({ placeholder, lineWrapping: true, readonly }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        decorateMarkdown(),
        formattingKeymap(),
        trackFormatting,
      ],
    }),
    [editorInputMode, themeMode, placeholder, readonly],
  );

  const handleAction = useActionHandler(view);

  // TODO(marijn): This doesn't update the state on view changes.
  //  Also not sure if view is even guaranteed to exist at this point.
  return (
    <div role='none' className={mx('fixed inset-0 flex flex-col')}>
      {toolbarState && <EditorToolbar onAction={handleAction} state={toolbarState} />}
      <div role='none' className='grow overflow-hidden'>
        <div className={attentionSurface} ref={parentRef} />
      </div>
    </div>
  );
};

const _EditorInputModeToolbar = ({
  editorInputMode,
  setEditorInputMode,
}: {
  editorInputMode: EditorInputMode;
  setEditorInputMode: (mode: EditorInputMode) => void;
}) => {
  return (
    <Select.Root value={editorInputMode} onValueChange={(value) => setEditorInputMode(value as EditorInputMode)}>
      <NaturalToolbar.Button asChild>
        <Select.TriggerButton variant='ghost'>{editorInputMode}</Select.TriggerButton>
      </NaturalToolbar.Button>
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {['default', 'vim'].map((mode) => (
              <Select.Option key={mode} value={mode}>
                {mode}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export const Default = {
  render: () => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor({
      extensions: [
        //
        createBasicExtensions({ placeholder: 'Enter text...' }),
        createThemeExtensions({ themeMode }),
      ],
    });

    return <div ref={parentRef} className={attentionSurface} />;
  },
};

export const Markdown = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    initialValue: '# Demo\n\nThis is a document.\n\n',
  },
};

export default {
  title: 'ui/react-ui-editor/InputMode',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
};
