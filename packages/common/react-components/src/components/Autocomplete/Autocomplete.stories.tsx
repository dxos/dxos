//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Autocomplete } from './Autocomplete';

export default {
  component: Autocomplete,
  actions: { argTypesRegex: '^on.*' }
};

export const Normal = (props: any) => {
  return <Autocomplete {...props} />;
};
