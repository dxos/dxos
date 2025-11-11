//
// Copyright 2025 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '../extensions';

import { Editor } from './Editor';

// TODO(burdon): Create story variants.
// TODO(burdon): Adapt Chat to use new Editor.
// TODO(burdon): Factor out components (esp. Popover).

const initialValue = ['# Blue Monday', '', 'How does it **feel**?', ''].join('\n');

const withExtensions: Decorator = (Story, { args }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      // Basic extensions.
      createBasicExtensions(),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [],
  );

  return <Story args={{ ...args, extensions, initialValue }} />;
};

const meta = {
  title: 'ui/react-ui-editor/Editor',
  component: Editor.Content,
  decorators: [withExtensions, withTheme, withLayout({ container: 'column' }), withAttention],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Editor.Content>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Editor.Root>
      <Editor.Content {...args} />
    </Editor.Root>
  ),
};

export const WithToolbar: Story = {
  render: (args) => (
    <Editor.Root>
      <Editor.Toolbar />
      <Editor.Content {...args} />
    </Editor.Root>
  ),
};

export const WithPopover: Story = {
  render: (args) => (
    <Editor.Root>
      <Editor.Toolbar />
      <Editor.Viewport>
        <Editor.Content {...args} />
      </Editor.Viewport>
    </Editor.Root>
  ),
};
