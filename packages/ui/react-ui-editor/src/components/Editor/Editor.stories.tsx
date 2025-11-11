//
// Copyright 2025 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '../../extensions';
import { insertAtCursor } from '../EditorMenuProvider';

import { Editor, type EditorContentProps } from './Editor';

// TODO(burdon): Adapt Chat and Markdown to use new Editor (plan first to check fit).
// TODO(burdon): Factor out components (esp. Popover).
// TODO(burdon): Remove redundent hooks.

faker.seed(1234);

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
    [themeMode],
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

const items = faker.helpers.multiple(faker.commerce.productName, { count: 10 }).sort();

export const WithPopover: Story = {
  render: (args) => (
    <Editor.Root
      trigger={['@']}
      getMenu={({ text }) => {
        return [
          {
            id: 'test',
            items: items
              .filter((item) => item.toLowerCase().includes(text.toLowerCase()))
              .map((item, i) => ({
                id: String(i),
                label: item,
                onSelect: ({ view, head }) => {
                  insertAtCursor(view, head, item);
                },
              })),
          },
        ];
      }}
    >
      <Editor.Viewport>
        <Editor.Toolbar />
        <Editor.Content {...args} />
      </Editor.Viewport>
    </Editor.Root>
  ),
};
