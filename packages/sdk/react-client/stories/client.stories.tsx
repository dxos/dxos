//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientInitializer, useClient } from '../src';

export default {
  title: 'react-client/ClientInitializer'
};

const TestApp = () => {
  const client = useClient();

  useEffect(() => {
    setImmediate(async () => {
      await client.halo.createProfile({ username: 'Test' });
    });
  }, []);

  return (
    <div>
      <div style={{ padding: 8 }}>
        Config
        <pre>
          {JSON.stringify(client.config, undefined, 2)}
        </pre>
      </div>

      {/* TODO(burdon): Show client profile. */}
      <div style={{ padding: 8 }}>
        Client
        <pre>
          {String(client.echo)}
        </pre>
      </div>
    </div>
  );
};

export const Primary = () => {
  return (
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <TestApp />
    </ClientInitializer>
  );
};
