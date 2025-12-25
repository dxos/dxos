//
// Copyright 2025 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/echo-db';
import { faker } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { createMenuGroup } from '../EditorMenuProvider';

import { Editor, type EditorContentProps } from './Editor';

// TODO(burdon): PreviewPopoverProvider (MarkdownStream, Preview story).
// TODO(burdon): Adapt Markdown plugin to use new Editor (plan first to check fit).
// TODO(burdon): Remove redundant hooks and simplify props.

faker.seed(1234);

const initialValue = ['# Blue Monday', '', 'How does it **feel**?', ''].join('\n');

const items = faker.helpers.multiple(faker.commerce.productName, { count: 10 }).sort();

// TODO(burdon): Adapter other tests in react-ui-editor/stories to use this pattern.
const withExtensions: Decorator<EditorContentProps> = (Story, { args }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      automerge(createDocAccessor(createObject(Text.make(args.initialValue)), ['content'])),
    ],
    [themeMode],
  );

  return <Story args={{ ...args, extensions }} />;
};

const meta = {
  title: 'ui/react-ui-editor/Editor',
  component: Editor.Content,
  decorators: [withExtensions, withTheme, withLayout({ container: 'column' }), withAttention],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    initialValue,
  },
} satisfies Meta<typeof Editor.Content>;

export default meta;

type Story = StoryObj<EditorContentProps>;

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
    <Editor.Root trigger={['@']} getMenu={({ text }) => [createMenuGroup({ items, filter: text })]}>
      <Editor.Viewport>
        <Editor.Toolbar />
        <Editor.Content {...args} />
      </Editor.Viewport>
    </Editor.Root>
  ),
};
