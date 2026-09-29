//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { EdgeWebsocketProtocol } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from '../defs.ts';
import { WebSocketMuxer } from '../edge-ws-muxer.ts';
import { toUint8Array } from '../protocol.ts';

export const DEFAULT_PORT = 8080;

type TestEdgeWsServerProps = {
  admitConnection?: Trigger;
  /** Resolves when the numbered upgrade attempt (from 1) may complete; overrides `admitConnection`. */
  admitConnectionAttempt?: (attempt: number) => Promise<void>;
  payloadDecoder?: (payload: Uint8Array) => any;
  messageHandler?: (payload: any) => Promise<Uint8Array | undefined>;
};

export const createTestEdgeWsServer = async (port = DEFAULT_PORT, params?: TestEdgeWsServerProps) => {
  const admittedAttempts: number[] = [];
  const wsServer = new WebSocket.Server({
    port,
    verifyClient: createConnectionDelayHandler(params, admittedAttempts),
    handleProtocols: () => EdgeWebsocketProtocol.V1,
  });

  // Open sockets in admission order. Like EDGE's router, the server talks to the newest open one.
  const connections: { ws: WebSocket; muxer: WebSocketMuxer }[] = [];
  const newestConnection = () => connections.at(-1);
  const requireNewestConnection = () => {
    const connection = newestConnection();
    invariant(connection, 'The test server has no open connection.');
    return connection;
  };

  const messageSink: any[] = [];
  const messageSourceLog: any[] = [];
  const closeTrigger = new Trigger();
  const sendResponseMessage = createResponseSender(() => requireNewestConnection().muxer);

  wsServer.on('connection', (ws: WebSocket) => {
    const muxer = new WebSocketMuxer(ws);
    const connection = { ws, muxer };
    connections.push(connection);
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
        if (responsePayload && newestConnection()) {
          sendResponseMessage(request, responsePayload);
        }
      }
      log('message', { payload: requestPayload });
      messageSink.push(requestPayload);
    });

    ws.on('close', () => {
      const index = connections.indexOf(connection);
      if (index !== -1) {
        connections.splice(index, 1);
      }
      closeTrigger.wake();
    });
  });

  return {
    server: wsServer,
    messageSink,
    messageSourceLog,
    endpoint: `ws://127.0.0.1:${port}`,
    cleanup: () => wsServer.close(),
    currentConnection: newestConnection,
    openConnectionCount: () => connections.length,
    /** Upgrade attempts admitted so far, by number; an admitted attempt's socket may already be gone. */
    admittedAttempts: () => [...admittedAttempts],
    sendResponseMessage,
    sendMessage: (msg: Message) => {
      return requireNewestConnection().muxer.send(msg);
    },
    closeConnection: () => {
      closeTrigger.reset();
      requireNewestConnection().ws.close(1011);
      return closeTrigger.wait();
    },
  };
};

const createConnectionDelayHandler = (params: TestEdgeWsServerProps | undefined, admittedAttempts: number[]) => {
  let attempts = 0;
  return (_: any, callback: (admit: boolean) => void) => {
    const attempt = ++attempts;
    const admit = () => {
      callback(true);
      admittedAttempts.push(attempt);
    };
    if (params?.admitConnectionAttempt) {
      void params.admitConnectionAttempt(attempt).then(admit);
    } else if (params?.admitConnection) {
      log('delaying edge connection admission');
      void params.admitConnection.wait().then(() => {
        admit();
        log('edge connection admitted');
      });
    } else {
      admit();
    }
  };
};

const createResponseSender = (connection: () => WebSocketMuxer) => {
  return (request: Message, responsePayload: Uint8Array) => {
    const recipient = request.source!;
    connection()
      .send(
        buf.create(MessageSchema, {
          source: {
            identityDid: recipient.identityDid,
            peerKey: recipient.peerKey,
          },
          serviceId: request.serviceId,
          payload: { value: responsePayload },
        }),
      )
      .catch((err) => log.catch(err));
  };
};

const decodePayload = async (request: Message, params: TestEdgeWsServerProps | undefined) => {
  const requestPayload = params?.payloadDecoder
    ? params.payloadDecoder(request.payload!.value!)
    : protocol.getPayload(request, TextMessageSchema);
  return { request, requestPayload };
};
