//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer, useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

/**
 * Demonstrate ClientInitializer
 */
export const Stage1 = () => {
  const App = () => {
    const client = useClient();

    return (
      <>
        <h2>Client Config</h2>
        <JsonTreeView data={client.config} />
      </>
    );
  };

  // TODO(wittjosiah): default config available elsewhere?
  const config = {
    storage: {},
    swarm: {
      signal: 'ws://localhost:4000',
      ice: [{ urls: 'stun:stun.wireline.ninja:3478' }]
    },
    wns: undefined,
    snapshots: false,
    snapshotInterval: undefined
  };

  return (
    <ClientInitializer config={config}>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tasks App/Stage 1',
  component: Stage1
};
