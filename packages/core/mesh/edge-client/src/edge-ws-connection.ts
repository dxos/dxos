//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { MessageSchema, type Message } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { type EdgeIdentity } from './edge-identity';
import { toUint8Array } from './protocol';

const SIGNAL_KEEPALIVE_INTERVAL = 5_000;

export type EdgeWsConnectionCallbacks = {
  onConnected: () => void;
  onMessage: (message: Message) => void;
  onRestartRequired: () => void;
};

export class EdgeWsConnection extends Resource {
  private _inactivityTimeoutCtx: Context | undefined;
  private _ws: WebSocket | undefined;

  constructor(
    private readonly _identity: EdgeIdentity,
    private readonly _connectionInfo: { url: URL; protocolHeader?: string },
    private readonly _callbacks: EdgeWsConnectionCallbacks,
  ) {
    super();
  }

  @logInfo
  public get info() {
    return {
      open: this.isOpen,
      identity: this._identity.identityKey,
      device: this._identity.peerKey,
    };
  }

  public send(message: Message) {
    invariant(this._ws);
    log('sending...', { peerKey: this._identity.peerKey, payload: protocol.getPayloadType(message) });
    this._ws.send(buf.toBinary(MessageSchema, message));
  }

  protected override async _open() {
    this._ws = new WebSocket(
      this._connectionInfo.url,
      this._connectionInfo.protocolHeader ? [this._connectionInfo.protocolHeader] : [],
    );

    this._ws.onopen = () => {
      if (this.isOpen) {
        log('connected');
        this._callbacks.onConnected();
        this._scheduleHeartbeats();
      } else {
        log.verbose('connected after becoming inactive', { currentIdentity: this._identity });
      }
    };
    this._ws.onclose = () => {
      if (this.isOpen) {
        log('disconnected while being open');
        this._callbacks.onRestartRequired();
      }
    };
    this._ws.onerror = (event) => {
      if (this.isOpen) {
        log.warn('edge connection socket error', { error: event.error, info: event.message });
        this._callbacks.onRestartRequired();
      } else {
        log.verbose('error ignored on closed connection', { error: event.error });
      }
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/data
     */
    this._ws.onmessage = async (event) => {
      if (!this.isOpen) {
        log.verbose('message ignored on closed connection', { event: event.type });
        return;
      }
      if (event.data === '__pong__') {
        this._rescheduleHeartbeatTimeout();
        return;
      }
      const data = await toUint8Array(event.data);
      if (this.isOpen) {
        const message = buf.fromBinary(MessageSchema, data);
        log('received', { from: message.source, payload: protocol.getPayloadType(message) });
        this._callbacks.onMessage(message);
      }
    };
  }

  protected override async _close() {
    void this._inactivityTimeoutCtx?.dispose().catch(() => {});

    try {
      this._ws?.close();
      this._ws = undefined;
    } catch (err) {
      if (err instanceof Error && err.message.includes('WebSocket is closed before the connection is established.')) {
        return;
      }
      log.warn('Error closing websocket', { err });
    }
  }

  private _scheduleHeartbeats() {
    invariant(this._ws);
    scheduleTaskInterval(
      this._ctx,
      async () => {
        // TODO(mykola): use RFC6455 ping/pong once implemented in the browser?
        // Cloudflare's worker responds to this `without interrupting hibernation`. https://developers.cloudflare.com/durable-objects/api/websockets/#setwebsocketautoresponse
        this._ws?.send('__ping__');
      },
      SIGNAL_KEEPALIVE_INTERVAL,
    );
    this._ws.send('__ping__');
    this._rescheduleHeartbeatTimeout();
  }

  private _rescheduleHeartbeatTimeout() {
    if (!this.isOpen) {
      return;
    }
    void this._inactivityTimeoutCtx?.dispose();
    this._inactivityTimeoutCtx = new Context();
    scheduleTask(
      this._inactivityTimeoutCtx,
      () => {
        if (this.isOpen) {
          this._callbacks.onRestartRequired();
        }
      },
      2 * SIGNAL_KEEPALIVE_INTERVAL,
    );
  }
}
