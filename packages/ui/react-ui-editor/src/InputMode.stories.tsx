//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { Toolbar as NaturalToolbar, Select, useThemeContext } from '@dxos/react-ui';
import { attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './components';
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

const Story = ({ autoFocus, initialValue, placeholder, readonly }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const [formattingState, trackFormatting] = useFormattingState();
  const [editorInputMode, setEditorInputMode] = useState<EditorInputMode>('default');
  const { parentRef, view } = useTextEditor(
    () => ({
      autoFocus,
      initialValue,
      moveToEndOfLine: true,
      extensions: [
        editorInputMode ? InputModeExtensions[editorInputMode] : [],
        createBasicExtensions({ placeholder, lineWrapping: true, readonly }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
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
      <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
        <Toolbar.Markdown />
        <EditorInputModeToolbar editorInputMode={editorInputMode} setEditorInputMode={setEditorInputMode} />
      </Toolbar.Root>

      <div role='none' className='grow overflow-hidden'>
        <div className={attentionSurface} ref={parentRef} />
      </div>
    </div>
  );
};

const EditorInputModeToolbar = ({
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

export default {
  title: 'react-ui-editor/InputMode',
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
  parameters: { translations, layout: 'fullscreen' },
  render: Story,
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
