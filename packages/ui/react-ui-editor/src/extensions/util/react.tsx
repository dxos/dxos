//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

export const renderRoot = (node: ReactNode) => {
  const el = document.createElement('div');
  createRoot(el).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return el;
};
