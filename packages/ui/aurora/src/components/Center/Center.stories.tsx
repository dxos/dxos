//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Center } from './Center';

export default {
  component: Center,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <Center {...props}>✨</Center>;
};
