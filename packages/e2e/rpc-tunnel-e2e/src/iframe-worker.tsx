//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort, createWorkerPort } from '@dxos/rpc-tunnel';

import { Channels } from './channels';
// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';

const IN_IFRAME = window.parent !== window;

const App = ({ worker }: { worker?: SharedWorker }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [closed, setClosed] = useState(true);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    if (worker) {
      const workerPort = createWorkerPort({
        port: worker.port,
        channel: Channels.ONE
      });

      const parentPort = createIFramePort({
        origin: 'http://localhost:5173',
        channel: Channels.ONE
      });

      workerPort.subscribe(async msg => {
        await parentPort.send(msg);
      });

      parentPort.subscribe(async msg => {
        await workerPort.send(msg);
      });
    } else {
      const port = await createIFramePort({
        iframe: iframeRef.current!,
        origin: 'http://127.0.0.1:5173',
        channel: Channels.ONE
      });
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
          // If main app is loaded from localhost, 127.0.0.1 is cross-origin.
          //   https://stackoverflow.com/a/5268240/2804332
          src='http://127.0.0.1:5173/iframe-worker.html'
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
    const worker = IN_IFRAME ? new SharedWorker() : undefined;

    createRoot(document.getElementById('root')!)
      .render(
        <StrictMode>
          <App worker={worker} />
        </StrictMode>
      );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
