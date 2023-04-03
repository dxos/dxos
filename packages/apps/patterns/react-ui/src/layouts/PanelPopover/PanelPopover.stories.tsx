//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { PanelPopover } from './PanelPopover';

export default {
  component: PanelPopover,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return <PanelPopover {...props} />;
};
