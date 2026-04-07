//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { MarkdownSettings } from './MarkdownSettings';

const meta = {
  title: 'plugins/plugin-markdown/components/MarkdownSettings',
  tags: ['settings'],
  component: MarkdownSettings,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof MarkdownSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      defaultViewMode: 'preview',
      editorInputMode: 'default',
      toolbar: true,
      numberedHeadings: false,
      folding: false,
      experimental: false,
      debug: false,
    },
  },
};
