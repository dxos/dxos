//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { StrictMode, useState } from 'react';
import { render } from 'react-dom';

import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createRpcClient } from '@dxos/rpc';
import { createSingletonPort } from '@dxos/rpc-worker-proxy';

import { schema } from './proto';

debug.enable('*');

const App = () => {
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    const service = schema.getService('dxos.test.rpc.TestStreamService');
    const port = await createSingletonPort('/iframe.html');
    const client = createRpcClient(service, { port });
    await client.open();
    const stream = client.rpc.testCall({ data: 'requestData' });
    stream.subscribe(msg => {
      setValue(msg.data);
    }, error => {
      if (error) {
        setError(error.message);
      }
      setClosed(true);
    });
  }, []);

  return (
    <JsonTreeView data={{
      closed,
      error,
      value
    }} />
  );
};

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
