//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Toolbar as NaturalToolbar, Select, useThemeContext, Tooltip } from '@dxos/react-ui';
import { attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { useActionHandler } from './useActionHandler';
import { useTextEditor } from './useTextEditor';
import { Toolbar } from '../components';
import { createBasicExtensions, createThemeExtensions } from '../extensions';
import {
  type EditorMode,
  EditorModes,
  decorateMarkdown,
  createMarkdownExtensions,
  formattingKeymap,
  table,
  useFormattingState,
  image,
} from '../extensions';
import translations from '../translations';

type StoryProps = {
  autoFocus?: boolean;
  placeholder?: string;
  doc?: string;
  readonly?: boolean;
};

const Story = ({ autoFocus, placeholder, doc, readonly }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const [formattingState, trackFormatting] = useFormattingState();
  const [editorMode, setEditorMode] = useState<EditorMode>('default');
  const { parentRef, view } = useTextEditor(
    () => ({
      autoFocus,
      doc,
      extensions: [
        editorMode ? EditorModes[editorMode] : [],
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
    [editorMode, themeMode, placeholder, readonly],
  );

  const handleAction = useActionHandler(view);

  // TODO(marijn): This doesn't update the state on view changes.
  //  Also not sure if view is even guaranteed to exist at this point.
  return (
    <div role='none' className={mx('fixed inset-0 flex flex-col')}>
      <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
        <Toolbar.Markdown />
        <EditorModeToolbar editorMode={editorMode} setEditorMode={setEditorMode} />
      </Toolbar.Root>
      <div role='none' className='grow overflow-hidden'>
        <div className={mx(textBlockWidth, attentionSurface)} ref={parentRef} />
      </div>
    </div>
  );
};

const EditorModeToolbar = ({
  editorMode,
  setEditorMode,
}: {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
}) => {
  return (
    <Select.Root value={editorMode} onValueChange={(value) => setEditorMode(value as EditorMode)}>
      <NaturalToolbar.Button asChild>
        <Select.TriggerButton variant='ghost'>{editorMode}</Select.TriggerButton>
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
  title: 'react-ui-editor/useTextEditor',
  decorators: [withTheme],
  render: (args: StoryProps) => (
    <Tooltip.Provider>
      <Story {...args} />
    </Tooltip.Provider>
  ),
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {
  render: () => {
    const { parentRef } = useTextEditor();
    return <div className={mx(textBlockWidth, attentionSurface)} ref={parentRef} />;
  },
};

export const Basic = {
  render: () => {
    const { themeMode } = useThemeContext();
    const { parentRef } = useTextEditor(() => ({
      extensions: [createBasicExtensions({ placeholder: 'Enter text...' }), createThemeExtensions({ themeMode })],
    }));
    return <div className={mx(textBlockWidth, attentionSurface)} ref={parentRef} />;
  },
};

export const Markdown = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    doc: '# Demo\n\nThis is a document.\n\n',
  },
};
