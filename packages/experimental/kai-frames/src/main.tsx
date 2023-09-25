//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { Config, Defaults } from '@dxos/react-client';

import '../style.css';

import { routes } from './router';

void initializeAppTelemetry({ namespace: 'kai', config: new Config(Defaults()) });

const root = createRoot(document.getElementById('root')!);
root.render(<RouterProvider router={createBrowserRouter(routes)} />);
