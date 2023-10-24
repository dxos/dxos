//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Center } from './Center';

export default {
  component: Center,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <Center {...props}>✨</Center>;
};
