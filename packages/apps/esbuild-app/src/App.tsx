//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { UiProvider, Heading } from '@dxos/react-ui';

export const App = () => {
  return (
    <UiProvider>
      <main className='mli-auto p-4'>
        <Heading level={1}>Hello world</Heading>
      </main>
    </UiProvider>
  );
};
