//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';
import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit';

import { App, namespace } from './App';

initializeAppTelemetry(namespace, new Config(Defaults()));

const root = createRoot(document.getElementById('root')!);

root.render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
