//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { PublicKeySelector } from './PublicKeySelector';

const meta: Meta = {
  title: 'devtools/devtools/PublicKeySelector',
  component: PublicKeySelector,
  decorators: [withTheme],
};

export default meta;

export const Normal = (props: any) => {
  return (
    <Toolbar.Root>
      <PublicKeySelector keys={[PublicKey.random(), PublicKey.random()]} {...props} />
    </Toolbar.Root>
  );
};
