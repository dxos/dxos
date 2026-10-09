//
// Copyright 2023 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { decorateMarkdown, image, join, linkTooltip, table } from '@dxos/ui-editor';

import { EditorStory, content, defaultExtensions, headings, renderLinkTooltip, text } from './testing/index.ts';

const meta = {
  title: 'ui/react-ui-editor/Markdown',
  component: EditorStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
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
    <EditorStory text={join(content.links, content.footer)} extensions={[linkTooltip({ render: renderLinkTooltip })]} />
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

export const BulletListEnter: Story = {
  render: () => <EditorStory extensions={[decorateMarkdown()]} />,
  play: async ({ canvasElement }) => {
    const view = await waitFor(() => {
      const view = EditorView.findFromDOM(canvasElement.querySelector<HTMLElement>('.cm-editor')!);
      void expect(view).toBeTruthy();
      return view!;
    });
    const type = async (doc: string, keys: string, expected: string) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: doc },
        selection: { anchor: doc.length },
      });
      view.focus();
      await userEvent.keyboard(keys);
      await expect(view.state.doc.toString()).toBe(expected);
    };

    await type('- one', '{Enter}', '- one\n- ');
    await type('- one', '{Enter}{Enter}', '- one\n');
  },
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
