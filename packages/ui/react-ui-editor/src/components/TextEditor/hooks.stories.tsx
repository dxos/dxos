//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
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
import { createModelExtensions, createThemeExtensions, useTextEditor } from '../../hooks';
import { markdownTheme } from '../../themes';

// TODO(burdon): Build components from hooks and adapters for model/extensions, etc.
// TODO(burdon): Remove BaseTextEditor.
// TODO(burdon): Move scrolling container layout/logic into TextEditor/MarkdownEditor components.

type StoryProps = {
  autoFocus?: boolean;
  placeholder?: string;
  doc?: string;
  readonly?: boolean;
};

const Story = ({ autoFocus, placeholder, doc, readonly }: StoryProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    autoFocus,
    doc,
    extensions: [
      //
      createThemeExtensions({ themeMode, theme: markdownTheme }),
      createModelExtensions({ readonly }),
      createMarkdownExtensions({ placeholder }),
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

  return (
    <div className='absolute inset-0 flex flex-col bg-white dark:bg-black'>
      <div role='none' className='px-20 py-2' ref={parentRef} />
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
