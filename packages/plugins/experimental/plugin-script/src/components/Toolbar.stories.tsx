//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

// import React from 'react';

import { Toolbar } from './Toolbar';

export default {
  title: 'plugin-script/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = { args: { binding: 'example', deployed: true } };
