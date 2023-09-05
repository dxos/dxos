//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { PublicKey } from '@dxos/client';
import { Identity } from '@dxos/client/halo';

import { HaloButton } from './HaloButton';

export default {
  component: HaloButton,
  actions: { argTypesRegex: '^on.*' },
};

const identity: Identity = {
  identityKey: PublicKey.random(),
};

export const Normal = (props: any) => {
  return <HaloButton identity={identity} />;
};
