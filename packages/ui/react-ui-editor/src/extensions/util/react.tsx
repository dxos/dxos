//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

export type ElementOptions = {
  className?: string;
};

export const createElement = (tag: string, options?: ElementOptions, children?: ReactNode): HTMLElement => {
  const el = document.createElement(tag);
  if (options?.className) {
    el.className = options.className;
  }
  if (children) {
    el.append(...(Array.isArray(children) ? children : [children]));
  }
  return el;
};

export const renderRoot = (root: HTMLElement, node: ReactNode): HTMLElement => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};
