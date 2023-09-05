//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { NavTree } from './NavTree';

export default {
  component: NavTree,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <NavTree {...props} />;
};
