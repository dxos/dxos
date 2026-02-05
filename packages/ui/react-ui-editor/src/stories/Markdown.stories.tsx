//
// Copyright 2023 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { decorateMarkdown, image, join, linkTooltip, table } from '@dxos/ui-editor';

import { EditorStory, content, defaultExtensions, headings, renderLinkTooltip, text } from './components';

const meta = {
  title: 'ui/react-ui-editor/Markdown',
  component: EditorStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Default
//

export const Default: Story = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} />,
};

export const Blockquote: Story = {
  render: () => (
    <EditorStory
      text={join('> Blockquote', 'continuation', content.footer)}
      extensions={decorateMarkdown()}
      debug='raw'
    />
  ),
};

export const Headings: Story = {
  render: () => <EditorStory text={headings} extensions={decorateMarkdown({ numberedHeadings: { from: 2, to: 4 } })} />,
};

export const Links: Story = {
  render: () => (
    <EditorStory text={join(content.links, content.footer)} extensions={[linkTooltip(renderLinkTooltip)]} />
  ),
};

export const Image: Story = {
  render: () => <EditorStory text={join(content.image, content.footer)} extensions={[image()]} />,
};

export const Code: Story = {
  render: () => <EditorStory text={join(content.codeblocks, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Lists: Story = {
  render: () => (
    <EditorStory
      text={join(content.tasks, '', content.bullets, '', content.numbered, content.footer)}
      extensions={[decorateMarkdown()]}
    />
  ),
};

//
// Bullet List
//

export const BulletList: Story = {
  render: () => <EditorStory text={join(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Ordered List
//

export const OrderedList: Story = {
  render: () => <EditorStory text={join(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Task List
//

export const TaskList: Story = {
  render: () => (
    <EditorStory text={join(content.tasks, content.footer)} extensions={[decorateMarkdown()]} debug='raw+tree' />
  ),
};

export const TaskListEmpty: Story = {
  render: () => <EditorStory text={join('- [ ] ')} extensions={[decorateMarkdown()]} debug='raw+tree' />,
};

//
// Table
//

export const Table: Story = {
  render: () => <EditorStory text={join(content.table, content.footer)} extensions={[decorateMarkdown(), table()]} />,
};

//
// Commented out
//

export const CommentedOut: Story = {
  render: () => (
    <EditorStory
      text={join('# Commented out', '', content.comment, content.footer)}
      extensions={[
        decorateMarkdown(),
        markdown(),
        // commentBlock()
      ]}
    />
  ),
};
