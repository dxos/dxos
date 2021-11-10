//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { LinearProgress } from '@mui/material';

import { ClientInitializer } from '@dxos/react-client';
import { ErrorView } from '@dxos/react-framework';

import { AppBar } from '../components';
import { WithSnackbarContext } from '../contexts';
import { useExtensionPort } from '../hooks';
import Main from './Main';

const Root = () => {
  const rpcPort = useExtensionPort();

  return (
    <ClientInitializer
      config={{ system: { remote: true } }}
      clientOpts={{ rpcPort }}
      loaderComponent={() => <LinearProgress />}
      errorComponent={ErrorView}
    >
      <WithSnackbarContext>
        <AppBar />
        <Main />
      </WithSnackbarContext>
    </ClientInitializer>
  );
};

export default Root;
