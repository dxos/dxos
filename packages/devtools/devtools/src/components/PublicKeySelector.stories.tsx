//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { PublicKeySelector } from './PublicKeySelector.tsx';

const meta = {
  title: 'devtools/devtools/PublicKeySelector',
  component: PublicKeySelector,
  render: (args) => (
    <Next.Toolbar.Root>
      <PublicKeySelector {...args} />
    </Next.Toolbar.Root>
  ),
  decorators: [withTheme()],
} satisfies Meta<typeof PublicKeySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Select key',
    keys: [PublicKey.random(), PublicKey.random()],
  },
};
