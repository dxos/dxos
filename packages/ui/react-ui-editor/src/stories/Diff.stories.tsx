//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { diffView } from '@dxos/ui-editor';

import { EditorStory } from './components';

// Two versions of a markdown document. The editor shows `modified` with insertions and deletions
// marked relative to `original` — exactly what the branch compare view renders (current branch vs
// another branch).
const original = ['# Release notes', '', '- Fixed a crash on startup.', '- Improved sync performance.', ''].join('\n');

const modified = [
  '# Release notes',
  '',
  '- Fixed a crash on startup and on resume.',
  '- Improved sync performance.',
  '- Added dark mode.',
  '',
].join('\n');

const meta = {
  title: 'ui/react-ui-editor/Diff',
  component: EditorStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Inline (unified) diff of two markdown versions — what the branch compare view renders. The editor
 * stays editable: typing updates the diff against `original` live (you edit the current branch while
 * viewing the diff to another branch).
 */
export const Markdown: Story = {
  render: () => <EditorStory text={modified} extensions={diffView({ original })} />,
};
