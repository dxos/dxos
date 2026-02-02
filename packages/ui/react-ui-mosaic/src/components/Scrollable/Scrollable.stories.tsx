//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Scrollable } from './Scrollable';

const DefaultStory = () => {
  return (
    <Scrollable axis='vertical'>
      <div role='none' className='bs-[200rem]' />
    </Scrollable>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-mosaic/Scrollable',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
