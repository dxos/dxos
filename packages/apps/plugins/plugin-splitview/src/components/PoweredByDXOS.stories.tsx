//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { PoweredByDXOS } from './PoweredByDXOS';

export default {
  component: PoweredByDXOS,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <PoweredByDXOS {...props} />;
};
