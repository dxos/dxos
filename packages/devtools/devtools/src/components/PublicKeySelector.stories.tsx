//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { PublicKey } from '@dxos/keys';

import { PublicKeySelector } from './PublicKeySelector';

export default {
  component: PublicKeySelector,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <PublicKeySelector keys={[PublicKey.random(), PublicKey.random()]} {...props} />;
};
