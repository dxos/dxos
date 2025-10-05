//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { PublicKeySelector } from './PublicKeySelector';

const meta = {
  title: 'devtools/devtools/PublicKeySelector',
  component: PublicKeySelector,
  render: (args) => (
    <Toolbar.Root>
      <PublicKeySelector {...args} />
    </Toolbar.Root>
  ),
  decorators: [withTheme],
} satisfies Meta<typeof PublicKeySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Select key',
    keys: [PublicKey.random(), PublicKey.random()],
  },
};
