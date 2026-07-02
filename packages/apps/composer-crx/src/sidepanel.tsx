//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { type Root as ReactRoot, createRoot } from 'react-dom/client';

import { Sidepanel } from './components';

declare global {
  // Survives dev-mode HMR re-execution of this entry module: React warns (and
  // detaches the old tree) if the same container is passed to createRoot twice.
  // eslint-disable-next-line no-var
  var __composerPanelRoot: ReactRoot | undefined;
}

const main = async () => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Panel root element #root not found.');
  }
  globalThis.__composerPanelRoot ??= createRoot(container);
  globalThis.__composerPanelRoot.render(<Sidepanel />);
};

void main();
