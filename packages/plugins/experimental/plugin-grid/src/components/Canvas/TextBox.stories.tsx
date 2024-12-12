//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TextBox, type TextBoxProps } from './TextBox';

const Render = (props: TextBoxProps) => {
  return (
    <div className='flex w-20 border-primary-500'>
      <TextBox {...props} />
    </div>
  );
};

const meta: Meta<TextBoxProps> = {
  title: 'plugins/plugin-grid/TextBox',
  component: TextBox,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = {
  args: {
    text: 'Test',
  },
};
