//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { Client } from '@dxos/client';

import { App } from './App';

export interface Shell {
  tabId: number,
  connect(cb: (client: Client) => void): void;
  onReload(cb: () => void): void;
}

export const initialize = (shell: Shell) => {
  shell.connect(client => {
    ReactDOM.render(
      <App client={client} />,
      document.getElementById('root')
    );
  });

  shell.onReload(() => {
    window.location.reload();
  });
};
