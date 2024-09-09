//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { HaloButton } from './HaloButton';

export default {
  title: 'plugin-navtree/HaloButton',
  component: HaloButton,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <HaloButton {...props} />;
};
