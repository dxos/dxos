//
// Copyright 2021 DXOS.org
//

import React, { useContext, useEffect, useState } from 'react';

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';

import { DevtoolsHost, schema } from '../proto';

export const DevtoolsContent = React.createContext<DevtoolsHost | undefined>(undefined);

export const useDevtoolsHost = () => {
  const host = useContext(DevtoolsContent);
  if (!host) {
    throw new Error('DevtoolsContent not set.');
  }

  return host;
};

interface WithDevtoolsRpcProps {
  port: RpcPort
  children: React.ReactNode
}

// TODO(burdon): HOC not used?
export const WithDevtoolsRpc = ({ port, children } : WithDevtoolsRpcProps) => {
  const [rpcClient, setRpcClient] = useState<ProtoRpcClient<DevtoolsHost> | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let open = false;

    const service = schema.getService('dxos.devtools.DevtoolsHost');
    const client = createRpcClient(service, {
      port: port
    });

    setImmediate(async () => {
      await client.open();
      open = true;
      setRpcClient(client);
      const stream = client.rpc.Events();
      stream.subscribe((msg) => {
        msg.ready && setReady(true);
      }, () => {});
    });

    return () => {
      open && client.close();
    };
  });

  if (!ready || !rpcClient) {
    return (
      <div style={{ padding: 8 }}>Waiting for DXOS client...</div>
    );
  }

  return (
    <DevtoolsContent.Provider value={rpcClient?.rpc}>
      {children}
    </DevtoolsContent.Provider>
  );
};
