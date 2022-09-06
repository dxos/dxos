//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIframeParentPort, createIframePort } from '@dxos/rpc-tunnel';

import { schema } from './proto';
import { TestClient } from './test-client';

debug.enable('*');

const IN_IFRAME = window.parent !== window;

const App = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    if (IN_IFRAME) {
      const port = createIframePort();
      const client = new TestClient();
      const server = createProtoRpcPeer({
        requested: {
          TestStreamService: schema.getService('dxos.test.rpc.TestStreamService')
        },
        exposed: {
          TestStreamService: schema.getService('dxos.test.rpc.TestStreamService')
        },
        handlers: client.handlers,
        port
      });
      await server.open();

      client.subscribe(value => setValue(String(value)));
    } else {
      const port = await createIframeParentPort(iframeRef.current!);
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
          src='http://127.0.0.1:5173'
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
