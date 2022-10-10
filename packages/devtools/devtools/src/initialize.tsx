//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';

import { App } from './App.js';

export const initializeDevtools = (clientReady: Event<Client>) => {
  ReactDOM.render(
    <App clientReady={clientReady} />,
    document.getElementById('root')
  );
};
