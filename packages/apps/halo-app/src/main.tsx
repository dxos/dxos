//
// Copyright 2020 DXOS.org
//

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';
import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';

import { App, namespace } from './App';

void initializeAppTelemetry(namespace, new Config(Defaults()));

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
