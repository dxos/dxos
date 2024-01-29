//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
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
} from '../../extensions';
import { createDataExtensions, createThemeExtensions, useActionHandler, useTextEditor } from '../../hooks';
import { markdownTheme } from '../../themes';
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
          // TODO(burdon): Document classes re base theme.
          //  Semantic tokens (e.g., replacement of input surface).
          editor: {
            className: 'h-full p-4 bg-white text-black dark:bg-black dark:text-white',
          },
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
    ],
  });

  const handleAction = useActionHandler(view);

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex h-full justify-center'>
        <div className='flex flex-col h-full w-[800px]'>
          <Toolbar.Root onAction={handleAction}>
            <Toolbar.Defaults />
          </Toolbar.Root>

          {/* TODO(burdon): Handle scrolling in component wrapper (like this). */}
          <div role='none' className='h-full overflow-y-auto' ref={parentRef} />
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/useTextEditor',
  component: TextEditor,
  decorators: [withTheme],
  render: (args: StoryProps) => <Story {...args} />,
};

export const Default = {
  args: {
    autoFocus: true,
    placeholder: 'Text...',
    doc: '# Demo\n\nThis is a document.\n\n',
  },
};
