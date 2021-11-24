//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { ClientInitializer } from '@dxos/react-client';
import { ErrorView, FrameworkContextProvider } from '@dxos/react-framework';
import { LinearProgress } from '@mui/material';

import Root from './components/Root';
import { initConfig } from './config';

const App = () => {
  return (
    <FrameworkContextProvider>
      <ClientInitializer config={initConfig} loaderComponent={() => <LinearProgress/>} errorComponent={ErrorView}>
        <Root />
      </ClientInitializer>
    </FrameworkContextProvider>
  );
};

export default App;
