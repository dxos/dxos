//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

import { App } from './App.js';

const configProvider = async () => new Config(await Dynamics(), Defaults());

(() => {
  render(
    <ClientProvider config={configProvider}>
      {/* TODO(wittjosiah): Remove once HALO app integration works. */}
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>,
    document.getElementById('root')
  );
})();
