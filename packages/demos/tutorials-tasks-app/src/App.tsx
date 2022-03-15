//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { configProvider } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { Root } from './components';

export const App = () => {
  return (
    <ClientProvider config={configProvider}>
      <Root />
    </ClientProvider>
  );
};
