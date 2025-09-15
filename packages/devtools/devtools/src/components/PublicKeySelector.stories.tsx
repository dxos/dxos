//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { PublicKeySelector } from './PublicKeySelector';

const meta = {
  title: 'devtools/devtools/PublicKeySelector',
  component: PublicKeySelector,
  decorators: [withTheme],
} satisfies Meta<typeof PublicKeySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal = (props: any) => {
  return (
    <Toolbar.Root>
      <PublicKeySelector keys={[PublicKey.random(), PublicKey.random()]} {...props} />
    </Toolbar.Root>
  );
};
