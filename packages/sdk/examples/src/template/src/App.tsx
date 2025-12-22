//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/ui-theme';

import { Demo, NetworkToggle } from './components';

const App = () => {
  return (
    <ThemeProvider tx={defaultTx}>
      <ClientRepeater
        className='flex place-content-evenly'
        component={Demo}
        count={2}
        createSpace
        controls={NetworkToggle}
      />
    </ThemeProvider>
  );
};

export default App;
