//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.scss';

import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit';

import { App } from './App';
import { namespace } from './Routes';

void initializeAppTelemetry(namespace, new Config(Defaults()));

createRoot(document.getElementById('root')!).render(<App />);
