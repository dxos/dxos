//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

const App = () => {
  const client = useClient();

  return (
    <div className='App'>
      <h1>React + Vite + DXOS</h1>
      <h2>On CodeSandbox!</h2>
      <div className='card'>
        <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>
      </div>
    </div>
  );
};

export default App;
