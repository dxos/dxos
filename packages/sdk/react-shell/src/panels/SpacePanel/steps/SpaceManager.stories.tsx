//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { SpaceManager } from './SpaceManager';

export default {
  component: SpaceManager,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <SpaceManager {...props} />;
};
