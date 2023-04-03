//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { JoinPanel } from './JoinPanel';

export default {
  component: JoinPanel,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return <JoinPanel {...props} />;
};
