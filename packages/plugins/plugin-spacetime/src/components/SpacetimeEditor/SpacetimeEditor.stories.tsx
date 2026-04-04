//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpacetimeEditor } from './SpacetimeEditor';

const DefaultStory = () => {
  return <SpacetimeEditor className='w-full h-full' />;
};

const meta = {
  title: 'plugins/plugin-spacetime/SpacetimeEditor',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
