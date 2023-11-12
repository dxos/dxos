//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { SettingsDialog } from './SettingsDialog';

export default {
  component: SettingsDialog,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    open: true,
    title: 'Settings',
    children: <div>Content</div>,
  },
};
