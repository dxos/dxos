//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useState } from 'react';
import { render } from 'react-dom';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { Channels } from './channels';
// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';

const App = ({ port }: { port: MessagePort }) => {
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    const rpcPort = await createWorkerPort({ port, channel: Channels.ONE });
    const client = createProtoRpcPeer({
      requested: {
        TestStreamService: schema.getService('example.testing.rpc.TestStreamService')
      },
      exposed: {},
      handlers: {},
      port: rpcPort
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
    <JsonTreeView data={{
      closed,
      error,
      value
    }} />
  );
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker();

    render(
      <StrictMode>
        <App port={worker.port} />
      </StrictMode>,
      document.getElementById('root')
    );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
