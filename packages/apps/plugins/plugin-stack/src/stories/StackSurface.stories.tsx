//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PluginContextProvider, ThemePlugin } from '@dxos/react-surface';

import { StackPlugin } from '../plugin';

const StackSurfacesApp = () => {
  return <PluginContextProvider plugins={[ThemePlugin, StackPlugin]} />;
};

export default {
  component: StackSurfacesApp,
};

export const Default = {
  args: {},
};
