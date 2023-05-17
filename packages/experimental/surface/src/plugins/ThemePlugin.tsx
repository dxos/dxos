//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { ThemeProvider } from '@dxos/aurora';

import { definePlugin } from '../framework';

import '@dxosTheme';

export const ThemePlugin = definePlugin({
  meta: {
    id: 'ThemePlugin'
  },
  provides: {
    context: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
  }
});
