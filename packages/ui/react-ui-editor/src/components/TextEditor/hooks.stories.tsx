//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useMemo, useState } from 'react';

import { Toolbar as NaturalToolbar, Select, useThemeContext, Tooltip } from '@dxos/react-ui';
import { attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import {
  type EditorMode,
  EditorModes,
  decorateMarkdown,
  createMarkdownExtensions,
  formatting,
  image,
  table,
  useFormattingState,
} from '../../extensions';
import { createDataExtensions, createThemeExtensions, useActionHandler, useTextEditor } from '../../hooks';
import { markdownTheme } from '../../themes';
import translations from '../../translations';
import { Toolbar } from '../Toolbar';

// TODO(burdon): Demo toolbar with hooks.
// TODO(burdon): Build components from hooks and adapters for model/extensions, etc.
// TODO(burdon): Remove BaseTextEditor.
// TODO(burdon): Move scrolling container layout/logic into TextEditor/MarkdownEditor components.
// TODO(burdon): Define keymap in composer framework format.

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
  const extensions = useMemo(
    () => [
      editorMode ? EditorModes[editorMode] : [],
      createDataExtensions({ readonly }),
      createThemeExtensions({
        themeMode,
        theme: markdownTheme,
        slots: {
          editor: { className: 'p-2' },
        },
      }),
      // TODO(burdon): Move lineWrapping.
      createMarkdownExtensions({ placeholder, lineWrapping: true }),
      // TODO(burdon): Move into markdown bundle (with React callbacks).
      decorateMarkdown(),
      formatting(),
      image(),
      table(),
      trackFormatting,
    ],
    [editorMode, themeMode, placeholder, trackFormatting, readonly],
  );
  const { parentRef, view } = useTextEditor({ autoFocus, doc, extensions });

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
        <div role='textbox' className={mx(textBlockWidth, attentionSurface)} ref={parentRef} />
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
  component: TextEditor,
  decorators: [withTheme],
  render: (args: StoryProps) => (
    <Tooltip.Provider>
      <Story {...args} />
    </Tooltip.Provider>
  ),
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    doc: '# Demo\n\nThis is a document.\n\n',
  },
};
