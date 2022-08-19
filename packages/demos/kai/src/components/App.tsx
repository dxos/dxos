//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';

import { Container } from './Container';

/**
 * Main App container.
 */
export const App = () => {
  return (
    <ClientProvider>
      <Container />
    </ClientProvider>
  );
};
