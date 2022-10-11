//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createWorkerPort, MessageChannel } from '@dxos/rpc-tunnel';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';

const App = ({ id, port }: { id: string, port: RpcPort }) => {
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    const client = createProtoRpcPeer({
      requested: {
        TestStreamService: schema.getService('example.testing.rpc.TestStreamService')
      },
      exposed: {},
      handlers: {},
      port
    });
    await client.open();

    const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });
    stream.subscribe(msg => {
      setValue(msg.data);
    }, error => {
      if (error) {
        setError(error.message);
      }
      setClosed(true);
    });

    setClosed(false);
  }, []);

  return (
    <div
      data-testid={id}
      style={{
        flexGrow: 1
      }}
    >
      <JsonTreeView data={{
        closed,
        error,
        value
      }} />
    </div>
  );
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    let ports: { id: string, port: RpcPort }[];
    const worker = new SharedWorker();
    const channel = new MessageChannel(async (channel, port) => {
      ports = await Promise.all([
        {
          channel,
          port,
          source: 'parent',
          destination: 'child'
        },
        {
          channel,
          port,
          source: 'proxy',
          destination: 'router'
        }
      ].map(options => ({
        id: options.source,
        port: createWorkerPort(options)
      })));
    });
    await channel.addPort(worker.port);

    createRoot(document.getElementById('root')!)
      .render(
        <StrictMode>
          <div style={{
            display: 'flex'
          }}>
            {ports!.map(port => (
              <App key={port.id} {...port} />
            ))}
          </div>
        </StrictMode>
      );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
