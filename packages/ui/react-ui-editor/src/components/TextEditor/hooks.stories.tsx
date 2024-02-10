//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import {
  code,
  createMarkdownExtensions,
  formatting,
  heading,
  hr,
  image,
  link,
  table,
  tasklist,
  useFormattingState,
} from '../../extensions';
import { createDataExtensions, createThemeExtensions, useActionHandler, useTextEditor } from '../../hooks';
import { editorFillLayoutEditor, editorFillLayoutRoot, editorWithToolbarLayout } from '../../styles';
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
  const { parentRef, view } = useTextEditor({
    autoFocus,
    doc,
    extensions: [
      //
      createDataExtensions({ readonly }),
      createThemeExtensions({
        themeMode,
        theme: markdownTheme,
        slots: {
          editor: { className: editorFillLayoutEditor },
        },
      }),
      // TODO(burdon): Move lineWrapping.
      createMarkdownExtensions({ placeholder, lineWrapping: true }),
      // TODO(burdon): Move into markdown bundle (with React callbacks).
      code(),
      formatting(),
      heading(),
      hr(),
      image(),
      link(),
      table(),
      tasklist(),
      trackFormatting,
    ],
  });

  const handleAction = useActionHandler(view);

  // FIXME This doesn't update the state on view changes. Also not
  // sure if view is even guaranteed to exist at this point.
  return (
    <div role='none' className={mx('fixed inset-0', editorWithToolbarLayout)}>
      <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
        <Toolbar.Markdown />
      </Toolbar.Root>
      <div role='none' className='overflow-y-auto'>
        <div
          role='textbox'
          className={mx(textBlockWidth, attentionSurface, editorFillLayoutRoot, 'p-4')}
          ref={parentRef}
        />
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/useTextEditor',
  component: TextEditor,
  decorators: [withTheme],
  render: (args: StoryProps) => <Story {...args} />,
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    doc: '# Demo\n\nThis is a document.\n\n',
  },
};
