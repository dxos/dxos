//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { createRouter } from './routes';

import 'virtual:fonts.css';
import '../style.css';

// TODO(burdon): Theme.
// TODO(burdon): Pluggable modules (panels).
// TODO(burdon): Separate API from modules.
// TODO(burdon): Mobile first.
// TODO(burdon): HALO credentials (initially just HALO identity). Client.
// TODO(burdon): Async import modules.

const root = createRoot(document.getElementById('root')!);
root.render(<RouterProvider router={createRouter()} />);
