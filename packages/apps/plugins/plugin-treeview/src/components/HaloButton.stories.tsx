//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { HaloButton } from './HaloButton';

export default {
  component: HaloButton,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <HaloButton {...props} />;
};
