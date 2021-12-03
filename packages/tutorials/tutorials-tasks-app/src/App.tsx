//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { ClientProvider } from '@dxos/react-client';
import { FrameworkContextProvider } from '@dxos/react-framework';

import { Root } from './components';
import { initConfig } from './config';

const App = () => {
  return (
    <FrameworkContextProvider>
      <ClientProvider config={initConfig}>
        <Root />
      </ClientProvider>
    </FrameworkContextProvider>
  );
};

export default App;
