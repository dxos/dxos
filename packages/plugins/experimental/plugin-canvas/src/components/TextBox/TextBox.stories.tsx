//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TextBox, type TextBoxProps } from './TextBox';

const Render = (props: TextBoxProps) => {
  return (
    <div className='flex w-[300px] p-2 rounded border border-primary-500'>
      <TextBox {...props} onClose={console.log} />
    </div>
  );
};

const meta: Meta<TextBoxProps> = {
  title: 'plugins/plugin-canvas/TextBox',
  component: TextBox,
  render: Render,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<TextBoxProps>;

export const Wrapping: Story = {
  args: {
    placeholder: 'Type something...',
    // value: 'Test',
  },
};

export const Centered: Story = {
  args: {
    centered: true,
    placeholder: 'Type something...',
    // value: 'Test',
  },
};
