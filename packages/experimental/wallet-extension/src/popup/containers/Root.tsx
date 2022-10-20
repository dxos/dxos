//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { AppBar } from '../components';
import { WithSnackbarContext, useExtensionPort } from '../hooks';
import { Main } from './Main';

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
