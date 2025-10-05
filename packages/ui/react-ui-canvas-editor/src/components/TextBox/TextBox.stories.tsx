//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { TextBox, type TextBoxProps } from './TextBox';

const DefaultStory = (props: TextBoxProps) => {
  return (
    <div className='flex w-[300px] rounded border border-primary-500'>
      <TextBox {...props} onEnter={console.log} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/TextBox',
  component: TextBox,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TextBox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Wrapping: Story = {
  args: {
    placeholder: 'Type something...',
  },
};

export const Centered: Story = {
  args: {
    centered: true,
    placeholder: 'Type something...',
  },
};

export const Markdown: Story = {
  args: {
    language: 'markdown',
    value: ['# Markdown', '', 'Hello world.'].join('\n'),
  },
};

export const Json: Story = {
  args: {
    language: 'json',
    value: JSON.stringify({ test: 100 }, null, 2),
  },
};
