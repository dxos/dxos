//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { EdgeWebsocketProtocol } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from '../defs';
import { WebSocketMuxer } from '../edge-ws-muxer';
import { toUint8Array } from '../protocol';

export const DEFAULT_PORT = 8080;

type TestEdgeWsServerParams = {
  admitConnection?: Trigger;
  payloadDecoder?: (payload: Uint8Array) => any;
  messageHandler?: (payload: any) => Promise<Uint8Array | undefined>;
};

export const createTestEdgeWsServer = async (port = DEFAULT_PORT, params?: TestEdgeWsServerParams) => {
  const wsServer = new WebSocket.Server({
    port,
    verifyClient: createConnectionDelayHandler(params),
    handleProtocols: () => EdgeWebsocketProtocol.V1,
  });

  let connection: { ws: WebSocket; muxer: WebSocketMuxer } | undefined;

  const messageSink: any[] = [];
  const messageSourceLog: any[] = [];
  const closeTrigger = new Trigger();
  const sendResponseMessage = createResponseSender(() => connection!.muxer);

  wsServer.on('connection', (ws: WebSocket) => {
    const muxer = new WebSocketMuxer(ws);
    connection = { ws, muxer };
    ws.on('error', (err: Error) => log.catch(err));
    ws.on('message', async (data: any) => {
      if (String(data) === '__ping__') {
        ws.send('__pong__');
        return;
      }
      const message = muxer.receiveData(await toUint8Array(data));
      if (!message) {
        return;
      }
      const { request, requestPayload } = await decodePayload(message, params);
      messageSourceLog.push(request.source);
      if (params?.messageHandler) {
        const responsePayload = await params.messageHandler(requestPayload);
        if (responsePayload && connection) {
          sendResponseMessage(request, responsePayload);
        }
      }
      log('message', { payload: requestPayload });
      messageSink.push(requestPayload);
    });

    ws.on('close', () => {
      connection = undefined;
      closeTrigger.wake();
    });
  });

  return {
    server: wsServer,
    messageSink,
    messageSourceLog,
    endpoint: `ws://127.0.0.1:${port}`,
    cleanup: () => wsServer.close(),
    currentConnection: () => connection,
    sendResponseMessage,
    sendMessage: (msg: Message) => {
      return connection!.muxer.send(msg);
    },
    closeConnection: () => {
      closeTrigger.reset();
      connection!.ws.close(1011);
      return closeTrigger.wait();
    },
  };
};

const createConnectionDelayHandler = (params: TestEdgeWsServerParams | undefined) => {
  return (_: any, callback: (admit: boolean) => void) => {
    if (params?.admitConnection) {
      log('delaying edge connection admission');
      void params.admitConnection.wait().then(() => {
        callback(true);
        log('edge connection admitted');
      });
    } else {
      callback(true);
    }
  };
};

const createResponseSender = (connection: () => WebSocketMuxer) => {
  return (request: Message, responsePayload: Uint8Array) => {
    const recipient = request.source!;
    void connection().send(
      buf.create(MessageSchema, {
        source: {
          identityKey: recipient.identityKey,
          peerKey: recipient.peerKey,
        },
        serviceId: request.serviceId!,
        payload: { value: responsePayload },
      }),
    );
  };
};

const decodePayload = async (request: Message, params: TestEdgeWsServerParams | undefined) => {
  const requestPayload = params?.payloadDecoder
    ? params.payloadDecoder(request.payload!.value!)
    : protocol.getPayload(request, TextMessageSchema);
  return { request, requestPayload };
};
