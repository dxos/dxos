//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import * as Theme from '@dxos/react-ui/Theme';

import { Demo, NetworkToggle } from './components/index.ts';

const App = () => {
  return (
    <Theme.Provider tx={Theme.defaultTx}>
      <ClientRepeater
        className='flex place-content-evenly'
        component={Demo}
        count={2}
        createSpace
        controls={NetworkToggle}
      />
    </Theme.Provider>
  );
};

export default App;
