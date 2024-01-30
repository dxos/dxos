//
// Copyright 2020 DXOS.org
//

import './main.css';

import { withProfiler } from '@sentry/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { initializeAppObservability } from '@braneframe/plugin-telemetry/headless';
import { Config, Defaults } from '@dxos/react-client';

import { Root, Todos } from './components';

void initializeAppObservability({ namespace: 'todomvc', config: new Config(Defaults()) });

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { path: '/', element: <Todos /> },
      { path: ':spaceKey', element: <Todos /> },
      { path: ':spaceKey/:state', element: <Todos /> },
    ],
  },
]);

const App = withProfiler(() => <RouterProvider router={router} />);

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
