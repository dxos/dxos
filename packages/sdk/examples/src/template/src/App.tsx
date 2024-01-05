//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Demo } from './components';

const App = () => {
  return (
    <ThemeProvider tx={defaultTx}>
      <ClientRepeater className='flex place-content-evenly' Component={Demo} count={2} createSpace networkToggle />
    </ThemeProvider>
  );
};

export default App;
