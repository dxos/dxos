//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { MessageSchema, TextMessageSchema, type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from '../defs';
import { toUint8Array } from '../protocol';

export const DEFAULT_PORT = 8080;

type TestEdgeWsServerParams = {
  admitConnection?: Trigger;
  payloadDecoder?: (payload: Uint8Array) => any;
  messageHandler?: (payload: any) => Promise<Uint8Array | undefined>;
};

export const createTestEdgeWsServer = async (port = DEFAULT_PORT, params?: TestEdgeWsServerParams) => {
  const server = new WebSocket.Server({ port, verifyClient: createConnectionDelayHandler(params) });

  let connection: WebSocket | undefined;

  const messageSink: any[] = [];
  const closeTrigger = new Trigger();
  const sendResponseMessage = createResponseSender(() => connection!);

  server.on('connection', (ws) => {
    connection = ws;
    ws.on('error', (err) => log.catch(err));
    ws.on('message', async (data) => {
      if (String(data) === '__ping__') {
        ws.send('__pong__');
        return;
      }
      const { request, requestPayload } = await decodeRequest(params, data);
      if (params?.messageHandler) {
        const responsePayload = await params.messageHandler(requestPayload);
        if (responsePayload) {
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
    server,
    messageSink,
    endpoint: `ws://localhost:${port}`,
    cleanup: () => server.close(),
    currentConnection: () => connection,
    sendResponseMessage,
    closeConnection: () => {
      closeTrigger.reset();
      connection!.close(1011);
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

const createResponseSender = (connection: () => WebSocket) => {
  return (request: Message, responsePayload: Uint8Array) => {
    const recipient = request.source!;
    connection().send(
      buf.toBinary(
        MessageSchema,
        buf.create(MessageSchema, {
          source: {
            identityKey: recipient.identityKey,
            peerKey: recipient.peerKey,
          },
          serviceId: request.serviceId!,
          payload: { value: responsePayload },
        }),
      ),
    );
  };
};

const decodeRequest = async (params: TestEdgeWsServerParams | undefined, data: any) => {
  const request = buf.fromBinary(MessageSchema, await toUint8Array(data));
  const requestPayload = params?.payloadDecoder
    ? params.payloadDecoder(request.payload!.value!)
    : protocol.getPayload(request, TextMessageSchema);
  return { request, requestPayload };
};
