//
// Copyright 2022 DXOS.org
//

import React, { StrictMode, useState } from 'react';
import { render } from 'react-dom';

import { PublicKey, schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';
import { SignalMessage, TestProtocolPlugin, testProtocolProvider, WebRTCTransportProxy } from '@dxos/network-manager';
import { discoveryKey } from '@dxos/crypto';
import { Protocol } from '@dxos/mesh-protocol';

const App = ({
  port,
  initiator,
  ownId,
  remoteId,
  topic,
  sessionId,
  sendSignal
}: {
  port: MessagePort,
  initiator: boolean,
  ownId: PublicKey,
  remoteId: PublicKey,
  topic: PublicKey,
  sessionId: PublicKey,
  sendSignal: (msg: SignalMessage) => void
}) => {
  const [closed, setClosed] = useState(true);
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    const rpcPort = await createWorkerPort({ port, source: 'parent', destination: 'child' });

    const plugin = new TestProtocolPlugin(ownId.asBuffer());
    const protocolProvider = testProtocolProvider(topic.asBuffer(), ownId.asBuffer(), plugin);
    const stream = protocolProvider({ channel: discoveryKey(topic), initiator }).stream;

    const transportProxy = new WebRTCTransportProxy({
      initiator,
      stream,
      ownId,
      remoteId,
      sessionId,
      topic,
      sendSignal,
      port: rpcPort
    })
    await transportProxy.init();

    plugin.on('receive', (p: Protocol, s: string) => {
      setValue(s)
    })
    plugin.on('disconnect', () => {
      setClosed(true);
    });

    plugin.on('connect', async () => {
      plugin.send(remoteId.asBuffer(), 'Hello message');
    })

    setClosed(false);
  }, []);

  return (
    <JsonTreeView data={{
      closed,
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
