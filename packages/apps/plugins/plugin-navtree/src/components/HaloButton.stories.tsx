//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { HaloButton } from './HaloButton';

export default {
  component: HaloButton,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <HaloButton {...props} />;
};
