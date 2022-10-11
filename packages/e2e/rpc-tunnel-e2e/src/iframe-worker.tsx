//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort, createIFrameWorkerRelay } from '@dxos/rpc-tunnel';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';

const IN_IFRAME = window.parent !== window;

const App = ({ port }: { port?: MessagePort }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    if (port) {
      const relay = createIFrameWorkerRelay({ origin: 'http://localhost:5173', port });
      await relay.start();
    } else {
      const rpcPort = await createIFramePort({ iframe: iframeRef.current!, origin: 'http://localhost:5173' });
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
          // If main app is loaded from localhost, localhost is cross-origin.
          //   https://stackoverflow.com/a/5268240/2804332
          src='http://localhost:5173/iframe-worker.html'
          style={{
            flexGrow: 1
          }}
        />
      )}
    </div>
  );
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    let worker: SharedWorker | undefined;
    if (IN_IFRAME) {
      worker = new SharedWorker();
      worker.port.start();
    }

    createRoot(document.getElementById('root')!)
      .render(
        <StrictMode>
          <App port={worker?.port} />
        </StrictMode>
      );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
