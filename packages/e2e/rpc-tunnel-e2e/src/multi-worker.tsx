//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { Channels } from './channels';
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
    const worker = new SharedWorker();
    const muxer = new PortMuxer(worker.port);
    const portOne = muxer.createWorkerPort({ channel: Channels.ONE });
    const portTwo = muxer.createWorkerPort({ channel: Channels.TWO });

    createRoot(document.getElementById('root')!)
      .render(
        <StrictMode>
          <div style={{
            display: 'flex'
          }}>
            <App id={Channels.ONE} port={portOne} />
            <App id={Channels.TWO} port={portTwo} />
          </div>
        </StrictMode>
      );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
