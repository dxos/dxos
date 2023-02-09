//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { createRouter } from '@dxos/kai';

import '@dxosTheme';
import '@dxos/kai/style.css';

const router = createRouter();
const root = createRoot(document.getElementById('root')!);
root.render(<RouterProvider router={router} />);
