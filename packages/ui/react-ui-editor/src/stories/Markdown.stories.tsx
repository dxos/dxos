//
// Copyright 2023 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { decorateMarkdown, image, linkTooltip, table } from '../extensions';
import { str } from '../testing';

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
      text={str('> Blockquote', 'continuation', content.footer)}
      extensions={decorateMarkdown()}
      debug='raw'
    />
  ),
};

export const Headings: Story = {
  render: () => <EditorStory text={headings} extensions={decorateMarkdown({ numberedHeadings: { from: 2, to: 4 } })} />,
};

export const Links: Story = {
  render: () => <EditorStory text={str(content.links, content.footer)} extensions={[linkTooltip(renderLinkTooltip)]} />,
};

export const Image: Story = {
  render: () => <EditorStory text={str(content.image, content.footer)} extensions={[image()]} />,
};

export const Code: Story = {
  render: () => <EditorStory text={str(content.codeblocks, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Lists: Story = {
  render: () => (
    <EditorStory
      text={str(content.tasks, '', content.bullets, '', content.numbered, content.footer)}
      extensions={[decorateMarkdown()]}
    />
  ),
};

//
// Bullet List
//

export const BulletList: Story = {
  render: () => <EditorStory text={str(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Ordered List
//

export const OrderedList: Story = {
  render: () => <EditorStory text={str(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Task List
//

export const TaskList: Story = {
  render: () => (
    <EditorStory text={str(content.tasks, content.footer)} extensions={[decorateMarkdown()]} debug='raw+tree' />
  ),
};

export const TaskListEmpty: Story = {
  render: () => <EditorStory text={str('- [ ] ')} extensions={[decorateMarkdown()]} debug='raw+tree' />,
};

//
// Table
//

export const Table: Story = {
  render: () => <EditorStory text={str(content.table, content.footer)} extensions={[decorateMarkdown(), table()]} />,
};

//
// Commented out
//

export const CommentedOut: Story = {
  render: () => (
    <EditorStory
      text={str('# Commented out', '', content.comment, content.footer)}
      extensions={[
        decorateMarkdown(),
        markdown(),
        // commentBlock()
      ]}
    />
  ),
};
