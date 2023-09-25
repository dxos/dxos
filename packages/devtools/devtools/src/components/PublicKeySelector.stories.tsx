//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';

import { PublicKeySelector } from './PublicKeySelector';

export default {
  component: PublicKeySelector,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return (
    <Toolbar.Root>
      <PublicKeySelector keys={[PublicKey.random(), PublicKey.random()]} {...props} />
    </Toolbar.Root>
  );
};
