//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientProvider, useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

/**
 * Demonstrate ClientInitializer
 */
export const Stage1 = () => {
  const App = () => {
    const client = useClient();

    return (
      <JsonTreeView data={client.config} />
    );
  };

  return (
    <ClientProvider>
      <App />
    </ClientProvider>
  );
};

export default {
  title: 'tasks-app/Stage 1',
  component: Stage1
};
