//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { useApp } from './useApp';

const DefaultStory = () => {
  const App = useApp({
    placeholder: () => <div className='fixed inset-0 flex items-center justify-center'>Loading...</div>,
  });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/App',
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
