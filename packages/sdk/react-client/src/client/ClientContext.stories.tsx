//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientProvider, useClient } from './ClientContext';

export default {
  title: 'react-client/ClientContext'
};

const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    {JSON.stringify(value, undefined, 2)}
  </pre>
);

const TestApp = () => {
  const client = useClient();

  useEffect(() => {
    setTimeout(async () => {
      await client.halo.createProfile({ displayName: 'test-user' });
    });
  }, []);

  return (
    <div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.config} />
      </div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.toJSON()} />
      </div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.halo.profile} />
      </div>
    </div>
  );
};

export const Primary = () => (
  <ClientProvider>
    <TestApp />
  </ClientProvider>
);

export const Secondary = () => (
  <ClientProvider config={() => ({})}>
    <TestApp />
  </ClientProvider>
);
