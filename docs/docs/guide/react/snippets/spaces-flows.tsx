//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { SpacesPage } from '@dxos/react-appkit';

export const App = () => {
  // typically you would put this on a specific route like /spaces
  return (
    <SpacesPage
      spacePath="/spaces/:space" // how to navigate to a specific space
      onSpaceCreate={() => {
        // handle the event that the user clicks "create space"
        // this is where you can initialize the space with new objects
      }}
    />
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
