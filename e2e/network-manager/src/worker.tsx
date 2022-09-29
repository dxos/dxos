//
// Copyright 2022 DXOS.org
//

import React, { Component, StrictMode, useState } from 'react';
import { render } from 'react-dom';

import { PublicKey, schema } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import config from './worker-config';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './test-worker?sharedworker';
import { MessageRouter, TestProtocolPlugin, testProtocolProvider, WebRTCTransportProxy } from '@dxos/network-manager';
import { discoveryKey } from '@dxos/crypto';
import { Protocol } from '@dxos/mesh-protocol';
import { SignalClient } from '@dxos/messaging';

const App = ({
  port,
  initiator,
  ownId,
  remoteId,
  topic,
  sessionId
}: {
  port: MessagePort,
  initiator: boolean,
  ownId: PublicKey,
  remoteId: PublicKey,
  topic: PublicKey,
  sessionId: PublicKey,
}) => {
  const [closed, setClosed] = useState(true);
  const [value, setValue] = useState<string>();

  useAsyncEffect(async () => {
    console.log('Using async effect');
    const rpcPort = await createWorkerPort({ port, source: 'parent', destination: 'child' });

    const plugin = new TestProtocolPlugin(ownId.asBuffer());
    const protocolProvider = testProtocolProvider(topic.asBuffer(), ownId.asBuffer(), plugin);
    const stream = protocolProvider({ channel: discoveryKey(topic), initiator }).stream;

    const signal: SignalClient = new SignalClient(
      `ws://localhost:${config.signalPort}/.well-known/dx/signal`,
      async msg => await messageRouter.receiveMessage(msg)
    );
    await signal.subscribeMessages(ownId);

    const messageRouter: MessageRouter = new MessageRouter({
      sendMessage: async msg => await signal.sendMessage(msg),
      onSignal: async msg => {
        if (ownId.equals(msg.recipient)) {
          await transportProxy.signal(msg.data.signal);
        }
      },
      onOffer: async () => { return { accept: true }; }
    });

    const transportProxy = new WebRTCTransportProxy({
      initiator,
      stream,
      ownId,
      remoteId,
      sessionId,
      topic,
      sendSignal: async msg => await messageRouter.signal(msg),
      port: rpcPort
    })
    await transportProxy.init();

    console.log('Subscribing listeners');
    plugin.on('receive', (p: Protocol, s: string) => {
      console.log(`Received ${s}`);
      setValue(s)
    })
    plugin.on('disconnect', () => {
      console.log(`Disconnected`);
      setClosed(true);
    });

    plugin.on('connect', async () => {
      console.log(`Connected`);
      plugin.send(remoteId.asBuffer(), 'Hello message');
    })

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
    console.log('Creating shared worker');
    const worker = new SharedWorker();
    worker.port.start()

    const searchParams = new URLSearchParams(window.location.toString().split('?').at(-1));
    let app;
    if (searchParams.get('peer') === '1') {
      console.log('Creating peer1 App');
      app = <App
        port={worker.port}
        initiator={true}
        ownId={PublicKey.from(config.peer1Id)}
        remoteId={PublicKey.from(config.peer2Id)}
        topic={PublicKey.from(config.topic)}
        sessionId={PublicKey.from(config.sessionId)}
      />
    } else if (searchParams.get('peer') === '2') {
      console.log('Creating peer2 App');
      app = <App
        port={worker.port}
        initiator={false}
        ownId={PublicKey.from(config.peer2Id)}
        remoteId={PublicKey.from(config.peer1Id)}
        topic={PublicKey.from(config.topic)}
        sessionId={PublicKey.from(config.sessionId)}
      />
    } else {
      throw new Error('Required "peer" query param');
    }

    console.log('Rendering');
    render(
      <StrictMode>
        {app}
      </StrictMode>,
      document.getElementById('root')
    );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
