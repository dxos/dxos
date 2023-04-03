//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { PanelSidebarProvider } from './PanelSidebar';

export default {
  component: PanelSidebarProvider,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return <PanelSidebarProvider {...props} />;
};
