//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { Demo, NetworkToggle } from './components/index.ts';

const App = () => {
  return (
    <ThemeProvider.ThemeProvider tx={ThemeProvider.defaultTx}>
      <ClientRepeater
        className='flex place-content-evenly'
        component={Demo}
        count={2}
        createSpace
        controls={NetworkToggle}
      />
    </ThemeProvider.ThemeProvider>
  );
};

export default App;
