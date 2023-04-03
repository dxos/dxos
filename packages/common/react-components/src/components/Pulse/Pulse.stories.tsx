//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Pulse } from './Pulse';

export default {
  component: Pulse,
  actions: { argTypesRegex: '^on.*' }
};
export const Small = (props: any) => {
  return <Pulse {...props} size={8} />;
};

export const Default = (props: any) => {
  return <Pulse {...props} />;
};

export const Large = (props: any) => {
  return <Pulse {...props} size={20} />;
};
