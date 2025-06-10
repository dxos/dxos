//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { markdown } from '@codemirror/lang-markdown';
import React from 'react';

import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, content, defaultExtensions, headings, renderLinkTooltip, str, text } from './utils';
import { decorateMarkdown, image, linkTooltip, table } from '../extensions';

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Markdown',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: EditorStory,
  parameters: { layout: 'fullscreen' },
};

export default meta;

//
// Default
//

export const Default = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} />,
};

export const Blockquote = {
  render: () => (
    <EditorStory
      text={str('> Blockquote', 'continuation', content.footer)}
      extensions={decorateMarkdown()}
      debug='raw'
    />
  ),
};

export const Headings = {
  render: () => <EditorStory text={headings} extensions={decorateMarkdown({ numberedHeadings: { from: 2, to: 4 } })} />,
};

export const Links = {
  render: () => <EditorStory text={str(content.links, content.footer)} extensions={[linkTooltip(renderLinkTooltip)]} />,
};

export const Image = {
  render: () => <EditorStory text={str(content.image, content.footer)} extensions={[image()]} />,
};

export const Code = {
  render: () => <EditorStory text={str(content.codeblocks, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Lists = {
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

export const BulletList = {
  render: () => <EditorStory text={str(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Ordered List
//

export const OrderedList = {
  render: () => <EditorStory text={str(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Task List
//

export const TaskList = {
  render: () => (
    <EditorStory text={str(content.tasks, content.footer)} extensions={[decorateMarkdown()]} debug='raw+tree' />
  ),
};

export const TaskListEmpty = {
  render: () => <EditorStory text={str('- [ ] ')} extensions={[decorateMarkdown()]} debug='raw+tree' />,
};

//
// Table
//

export const Table = {
  render: () => <EditorStory text={str(content.table, content.footer)} extensions={[decorateMarkdown(), table()]} />,
};

//
// Commented out
//

export const CommentedOut = {
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
