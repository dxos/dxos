//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';

import { Root } from './components';
import { initConfig } from './config';

export const App = () => {
  return (
    <ClientProvider config={initConfig}>
      <Root />
    </ClientProvider>
  );
};
