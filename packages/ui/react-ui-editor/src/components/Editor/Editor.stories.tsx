//
// Copyright 2025 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/echo-db';
import { random } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { createMenuGroup } from '../EditorMenuProvider';
import { Editor, type EditorViewProps } from './Editor';

random.seed(1234);

const initialValue = ['# Blue Monday', '', 'How does it **feel**?', ''].join('\n');

const items = random.helpers.multiple(random.commerce.productName, { count: 10 }).sort();

const withExtensions: Decorator<EditorViewProps> = (Story, { args }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      automerge(createDocAccessor(createObject(Text.make({ content: args.initialValue })), ['content'])),
    ],
    [themeMode],
  );

  return <Story args={{ ...args, extensions }} />;
};

const meta = {
  title: 'ui/react-ui-editor/Editor',
  component: Editor.View,
  decorators: [withExtensions, withTheme(), withLayout({ layout: 'column' }), withAttention()],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    initialValue,
  },
} satisfies Meta<typeof Editor.View>;

export default meta;

type Story = StoryObj<EditorViewProps>;

export const Default: Story = {
  render: (args) => (
    <Editor.Root>
      <Editor.View {...args} />
    </Editor.Root>
  ),
};

export const WithToolbar: Story = {
  render: (args) => (
    <Editor.Root>
      <Editor.Toolbar />
      <Editor.View {...args} />
    </Editor.Root>
  ),
};

export const WithPopover: Story = {
  render: (args) => (
    <Editor.Root trigger={['@']} getMenu={({ text }) => [createMenuGroup({ items, filter: text })]}>
      <Editor.Content>
        <Editor.Toolbar />
        <Editor.View {...args} />
      </Editor.Content>
    </Editor.Root>
  ),
};
