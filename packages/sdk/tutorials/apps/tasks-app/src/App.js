//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { ClientInitializer } from '@dxos/react-client';

import Root from './components/Root';
import { initConfig } from './config';

/**
 * Root container.
 */

const App = () => {
  return (
    <ClientInitializer config={initConfig}>
      <Root />
    </ClientInitializer>
  );
};

export default App;
