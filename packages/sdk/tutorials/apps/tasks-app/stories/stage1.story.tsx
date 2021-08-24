//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer, useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-framework';

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
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tasks App/Stage 1',
  component: Stage1
};
