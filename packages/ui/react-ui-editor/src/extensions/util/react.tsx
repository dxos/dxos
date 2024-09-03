//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

export const renderRoot = (root: HTMLElement, node: ReactNode): HTMLElement => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};
