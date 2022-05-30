//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';

import { App } from './App';

export interface Shell {
  tabId: number,
  connect(cb: (clientReady: Event<Client>) => void): void;
  onReload(cb: () => void): void;
}

export const initialize = (shell: Shell) => {
  shell.connect(clientReady => {
    ReactDOM.render(
      <App clientReady={clientReady} />,
      document.getElementById('root')
    );
  });

  shell.onReload(() => {
    window.location.reload();
  });
};
