//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Searchbar } from './Searchbar';

export default {
  component: Searchbar,
  actions: { argTypesRegex: '^on.*' }
};

export const Normal = (props: any) => {
  return <Searchbar {...props} />;
};
