//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';

import { App } from './App';

export const initializeDevtools = (clientReady: Event<Client>) => {
  createRoot(document.getElementById('root')!)
    .render(<App clientReady={clientReady} />);
};
