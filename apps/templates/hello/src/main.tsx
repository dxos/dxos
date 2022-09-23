//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';

const configProvider = async () => new Config(await Dynamics(), Defaults());

(() => {
  render(
    <ClientProvider config={configProvider}>
      <App />
    </ClientProvider>,
    document.getElementById('root')
  );
})();
