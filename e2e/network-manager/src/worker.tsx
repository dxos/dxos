//
// Copyright 2022 DXOS.org
//

import React, { Component, StrictMode, useState } from 'react';
import { render } from 'react-dom';

import { schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';
import { WebRTCTransportService } from './webrtc-transport-service';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';

const App = ({
  port
}: {
  port: MessagePort
}) => {
  const [closed, setClosed] = useState(true);
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    console.log('Using async effect');
    const rpcPort = await createWorkerPort({ port, source: 'parent', destination: 'child' });

    const webRTCTransportService: BridgeService = new WebRTCTransportService();

    // Starting WebRTCService
    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      handlers: { BridgeService: webRTCTransportService },
      port: rpcPort,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });

    await server.open();
    console.log('Bridge Service ready');

    setClosed(false);
  }, []);
  console.log("App ready");
  return (
    <JsonTreeView data={{
      closed,
      value
    }} />
  );
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const searchParams = new URLSearchParams(window.location.toString().split('?').at(-1));

    console.log('Creating shared worker');
    const worker = new SharedWorker();
    worker.port.start()
    worker.port.postMessage({ initMessage: true, peer: searchParams.get('peer') });

    console.log('Rendering');
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
