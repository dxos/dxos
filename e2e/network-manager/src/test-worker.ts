//
// Copyright 2022 DXOS.org
//

import { PublicKey, schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createWorkerPort, MessageChannel } from '@dxos/rpc-tunnel';
import { MessageRouter, TestProtocolPlugin, testProtocolProvider, WebRTCTransportProxy } from '@dxos/network-manager';
import { discoveryKey } from '@dxos/crypto';
import { SignalClient } from '@dxos/messaging';
import config from './worker-config';
import { Protocol } from '@dxos/mesh-protocol';
import { Trigger } from '@dxos/async';

interface SetupParams {
  port: RpcPort,
  initiator: boolean,
  ownId: PublicKey,
  remoteId: PublicKey,
  topic: PublicKey,
  sessionId: PublicKey,
}

const setup = async ({
  port,
  initiator,
  ownId,
  remoteId,
  topic,
  sessionId
}: SetupParams) => {
  const plugin = new TestProtocolPlugin(ownId.asBuffer());
  const protocolProvider = testProtocolProvider(topic.asBuffer(), ownId.asBuffer(), plugin);

  const signal: SignalClient = new SignalClient(
    `ws://localhost:${config.signalPort}/.well-known/dx/signal`,
    async msg => await messageRouter.receiveMessage(msg)
  );
  await signal.subscribeMessages(ownId);

  const messageRouter: MessageRouter = new MessageRouter({
    sendMessage: async msg => await signal.sendMessage(msg),
    onSignal: async msg => {
      console.log(`Received signal ${JSON.stringify(msg)}`);
      await transportProxy.signal(msg.data.signal);
    },
    onOffer: async () => { return { accept: true }; }
  });

  // {
  //   const msg = {
  //     author: ownId,
  //     recipient: remoteId,
  //     topic,
  //     sessionId,
  //     data: { signal: { json: ' {"message": "Init message"}' } }
  //   }
  //   await messageRouter.signal(msg);
  // }
  
  const transportProxy = new WebRTCTransportProxy({
    initiator,
    stream: protocolProvider({ channel: discoveryKey(topic), initiator }).stream,
    ownId,
    remoteId,
    sessionId,
    topic,
    sendSignal: async msg => await messageRouter.signal(msg),
    port
  })
  await transportProxy.init();

  console.log('Subscribing listeners');
  plugin.on('receive', (p: Protocol, s: string) => {
    console.log(`Received ${s}`);
  })
  plugin.on('disconnect', () => {
    console.log(`Disconnected`);
  });

  plugin.on('connect', async () => {
    console.log(`Connected`);
    plugin.send(remoteId.asBuffer(), 'Hello message');
  })
};

let channel: MessageChannel;
const trigger = new Trigger();

console.log('Shared worker file imported');
onconnect = async event => {
  console.log(`OnConnect ${event}`);
  event.ports[0].onmessage = (ev: MessageEvent) => {
    console.log(`Port message: ${JSON.stringify(ev.data)}`);
    if (!!ev.data.initMessage) {
      trigger.wake();
      if (ev.data.peer === '1') {
        channel = new MessageChannel(async (channel, port) => {
          await setup({
            initiator: true,
            ownId: PublicKey.from(config.peer1Id),
            remoteId: PublicKey.from(config.peer2Id),
            sessionId: PublicKey.from(config.sessionId),
            topic: PublicKey.from(config.topic),
            port: createWorkerPort({ channel, port, source: 'child', destination: 'parent' })
          });
        });
      } else if (ev.data.peer === '2') {
        channel = new MessageChannel(async (channel, port) => {
          await setup({
            initiator: false,
            ownId: PublicKey.from(config.peer2Id),
            remoteId: PublicKey.from(config.peer1Id),
            sessionId: PublicKey.from(config.sessionId),
            topic: PublicKey.from(config.topic),
            port: createWorkerPort({ channel, port, source: 'child', destination: 'parent' })
          });
        });
      } else {
        throw new Error('Message should contain peer data');
      }
    }
  };


  console.log('Waiting for Peer trigger...');
  trigger.wait().then(
    () => {
      console.log('Trigger waked!');
      channel.onConnect(event);
    }, error => console.log(error)
  );
};

// chrome://inspect/#workers