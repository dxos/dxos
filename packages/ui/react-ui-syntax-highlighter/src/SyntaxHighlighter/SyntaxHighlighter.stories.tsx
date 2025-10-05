//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { trim } from '@dxos/util';

import { SyntaxHighlighter } from './SyntaxHighlighter';

const meta = {
  title: 'ui/react-ui-syntax-highlighter/SyntaxHighlighter',
  component: SyntaxHighlighter,
} satisfies Meta<typeof SyntaxHighlighter>;

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
    language: 'tsx',
    children: trim`
      import React from 'react'
      
      const Test = () => {
        return <div>Test</div>
      }
    `,
  },
};

export const Empty: Story = {
  args: {
    children: false,
  },
};
