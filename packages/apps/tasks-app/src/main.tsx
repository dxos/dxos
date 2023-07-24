//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.scss';

import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { Config, Defaults } from '@dxos/react-client';

import { App } from './App';
import { namespace } from './Routes';

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(<App />);
