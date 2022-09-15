//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerParentPort } from '@dxos/rpc-tunnel';

import { schema } from './proto';
// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';

const App = ({ messagePort }: { messagePort: MessagePort }) => {
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    const port = await createWorkerParentPort(messagePort);
    const client = createProtoRpcPeer({
      requested: {
        TestStreamService: schema.getService('dxos.test.rpc.TestStreamService')
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
    <JsonTreeView data={{
      closed,
      error,
      value
    }} />
  );
};

if (typeof Worker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker();
    worker.port.start();

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App messagePort={worker.port} />
      </StrictMode>
    );
  })();
} else {
  throw new Error('Requires a browser with support for workers.');
}
