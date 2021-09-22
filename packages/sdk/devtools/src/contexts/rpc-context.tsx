//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { createRpcClient, ProtoRpcClient, RpcPort } from '@dxos/rpc';
import { DevtoolsHost, schema } from '../proto';
import { WithDevtoolsHostContext } from './devtools-host-context';

interface WithDevtoolsRpcProps {
  port: RpcPort,
  children: React.ReactNode
}

const WithDevtoolsRpc = ({ port, children } : WithDevtoolsRpcProps) => {
  const [rpcClient, setRpcClient] = useState<ProtoRpcClient<DevtoolsHost> | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let open = false;
    let client: ProtoRpcClient<DevtoolsHost>;
    const service = schema.getService('dxos.devtools.DevtoolsHost');
    client = createRpcClient(service, {
      port: port
    });

    setImmediate(async () => {
      await client.open();
      open = true;
      setRpcClient(client);
      const stream = client.rpc.Events({});
      stream.subscribe((msg) => { msg.ready && setReady(true) }, () => {});
    });

    return () => { open && client.close() };
  });

  return (
    <>
      {(!ready || !rpcClient) && (<div>
          <div style={{ padding: 8 }}> Waiting for DXOS client... </div>
        </div>)}
      {(ready && rpcClient ) && (<WithDevtoolsHostContext devtoolsHost={rpcClient?.rpc}>
          {children}
        </WithDevtoolsHostContext>)}
    </>
  );
};

export { WithDevtoolsRpc };
