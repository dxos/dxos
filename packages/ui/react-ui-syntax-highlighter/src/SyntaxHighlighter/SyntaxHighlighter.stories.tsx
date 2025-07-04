//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { SyntaxHighlighter } from './SyntaxHighlighter';

const meta: Meta<typeof SyntaxHighlighter> = {
  title: 'ui/react-ui-syntax-highlighter/SyntaxHighlighter',
  component: SyntaxHighlighter,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<typeof SyntaxHighlighter>;

export const Default: Story = {
  args: {
    language: 'json',
    classNames: 'text-sm',
    children: JSON.stringify({ message: 'DXOS', initialized: true }, null, 2),
  },
};

export const Typescript: Story = {
  args: {
    language: 'ts',
    children: 'const x = 100;',
  },
};

export const Empty: Story = {
  args: {
    children: false,
  },
};
