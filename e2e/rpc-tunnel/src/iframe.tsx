//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIframeParentPort, createIframePort } from '@dxos/rpc-tunnel';

import { TestClient } from './test-client';

const IN_IFRAME = window.parent !== window;

const App = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    if (IN_IFRAME) {
      const port = createIframePort('http://127.0.0.1:5173');
      const client = new TestClient();
      const server = createProtoRpcPeer({
        requested: {
          TestStreamService: schema.getService('dxos.testing.rpc.TestStreamService')
        },
        exposed: {
          TestStreamService: schema.getService('dxos.testing.rpc.TestStreamService')
        },
        handlers: client.handlers,
        port
      });
      await server.open();

      client.subscribe(value => setValue(String(value)));
    } else {
      const port = await createIframeParentPort(iframeRef.current!, 'http://localhost:5173');
      const client = createProtoRpcPeer({
        requested: {
          TestStreamService: schema.getService('dxos.testing.rpc.TestStreamService')
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
    }

    setClosed(false);
  }, []);

  return (
    <div style={{
      display: 'flex'
    }}>
      <div style={{
        flexGrow: 1
      }}>
        <JsonTreeView data={{
          closed,
          error,
          value
        }} />
      </div>
      {!IN_IFRAME && (
        <iframe
          ref={iframeRef}
          id='test-iframe'
          // If main app is loaded from 127.0.0.1, localhost is cross-origin.
          //   https://stackoverflow.com/a/5268240/2804332
          src='http://localhost:5173/iframe.html'
          style={{
            flexGrow: 1
          }}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
