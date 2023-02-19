//
// Copyright 2020 DXOS.org
//

import './main.css';
import '@dxos/client/shell.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { Root, Todos } from './components';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { path: '/', element: <Todos /> },
      { path: ':spaceKey', element: <Todos /> },
      { path: ':spaceKey/:state', element: <Todos /> }
    ]
  }
]);

const root = createRoot(document.getElementById('root')!);
root.render(<RouterProvider router={router} />);
