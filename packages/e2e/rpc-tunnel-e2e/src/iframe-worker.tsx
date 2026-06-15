//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JSONTree } from 'react-json-tree';

import { Trigger } from '@dxos/async';
import { schema } from '@dxos/protocols/proto';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type RpcPort, createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

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
    const port = new Trigger<RpcPort>();
    const messageHandler = async (event: MessageEvent) => {
      if (event.data.type !== 'init') {
        return;
      }

      port.wake(createWorkerPort({ port: event.data.port, channel: Channels.TWO }));
    };

    if (worker) {
      port.wake(createWorkerPort({ port: worker.port, channel: Channels.ONE }));
    } else {
      window.addEventListener('message', messageHandler);
    }

    const client = createProtoRpcPeer({
      requested: {
        TestStreamService: schema.getService('example.testing.rpc.TestStreamService'),
      },
      exposed: {},
      handlers: {},
      port: await port.wait(),
    });
    await client.open();

    const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });
    stream.subscribe(
      (msg) => {
        setValue(msg.data);
      },
      (error) => {
        if (error) {
          setError(error.message);
        }
        setClosed(true);
      },
    );

    setClosed(false);

    return () => {
      void stream.close();
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flexGrow: 1 }}>
        <JSONTree
          data={{
            closed,
            error,
            value,
          }}
        />
      </div>
      {!IN_IFRAME && (
        <iframe
          ref={iframeRef}
          id='test-iframe'
          // If main app is loaded from localhost, 127.0.0.1 is cross-origin.
          //   https://stackoverflow.com/a/5268240/2804332
          src='http://127.0.0.1:5173/iframe-worker.html'
          style={{
            flexGrow: 1,
          }}
        />
      )}
    </div>
  );
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const workerForParent = IN_IFRAME ? new SharedWorker() : undefined;
    const worker = IN_IFRAME ? new SharedWorker() : undefined;

    IN_IFRAME && window.parent.postMessage({ type: 'init', port: workerForParent.port }, '*', [workerForParent.port]);

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App worker={worker} />
      </StrictMode>,
    );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
