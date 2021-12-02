//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';

import { AppBar } from '../components';
import { WithSnackbarContext } from '../contexts';
import { useExtensionPort } from '../hooks';
import { Main } from './Main';

export const Root = () => {
  const rpcPort = useExtensionPort();

  return (
    <ClientProvider
      config={{ system: { remote: true } }}
      options={{ rpcPort }}
    >
      <WithSnackbarContext>
        <AppBar />
        <Main />
      </WithSnackbarContext>
    </ClientProvider>
  );
};
