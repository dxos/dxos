//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Toolbar as NaturalToolbar, Select, useThemeContext, Tooltip } from '@dxos/react-ui';
import { attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { useActionHandler } from './useActionHandler';
import { useTextEditor, type UseTextEditorProps } from './useTextEditor';
import { Toolbar } from '../components';
import {
  type EditorInputMode,
  decorateMarkdown,
  createMarkdownExtensions,
  formattingKeymap,
  image,
  table,
  useFormattingState,
  createBasicExtensions,
  createThemeExtensions,
  InputModeExtensions,
} from '../extensions';
import translations from '../translations';

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
        image(),
        table(),
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
      <Tooltip.Provider>
        <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
          <Toolbar.Markdown />
          <EditorInputModeToolbar editorInputMode={editorInputMode} setEditorInputMode={setEditorInputMode} />
        </Toolbar.Root>
      </Tooltip.Provider>

      <div role='none' className='grow overflow-hidden'>
        <div className={mx(textBlockWidth, attentionSurface)} ref={parentRef} />
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
  decorators: [withTheme, withFullscreen()],
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

    return <div ref={parentRef} className={mx(textBlockWidth, attentionSurface, 'w-full')} />;
  },
};

export const Markdown = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    initialValue: '# Demo\n\nThis is a document.\n\n',
  },
};
