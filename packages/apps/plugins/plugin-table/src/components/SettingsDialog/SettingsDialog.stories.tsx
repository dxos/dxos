//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SettingsDialog } from './SettingsDialog';

export default {
  component: SettingsDialog,
  decorators: [withTheme],
};

export const Default = {
  args: {
    open: true,
    title: 'Settings',
    children: <div>Content</div>,
  },
};
