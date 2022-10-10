//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { AppBar } from '../components/index.js';
import { WithSnackbarContext, useExtensionPort } from '../hooks/index.js';
import { Main } from './Main.js';

export const Root = () => {
  const rpcPort = useExtensionPort();

  return (
    <ClientProvider
      config={{ runtime: { client: { mode: Runtime.Client.Mode.REMOTE } } }}
      options={{ rpcPort }}
    >
      <WithSnackbarContext>
        <AppBar />
        <Main />
      </WithSnackbarContext>
    </ClientProvider>
  );
};
