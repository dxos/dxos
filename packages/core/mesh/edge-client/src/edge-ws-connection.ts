//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { EdgeWebsocketProtocol } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { type Message, MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { type EdgeIdentity } from './edge-identity';
import { CLOUDFLARE_MESSAGE_MAX_BYTES, WebSocketMuxer } from './edge-ws-muxer';
import { toUint8Array } from './protocol';

const SIGNAL_KEEPALIVE_INTERVAL = 4_000;
const SIGNAL_KEEPALIVE_TIMEOUT = 12_000;

export type EdgeWsConnectionCallbacks = {
  onConnected: () => void;
  onMessage: (message: Message) => void;
  onRestartRequired: () => void;
};

export class EdgeWsConnection extends Resource {
  private _inactivityTimeoutCtx: Context | undefined;
  private _ws: WebSocket | undefined;
  private _wsMuxer: WebSocketMuxer | undefined;
  private _lastReceivedMessageTimestamp = Date.now();

  private _openTimestamp: number | undefined;

  // Latency tracking.
  private _pingTimestamp: number | undefined;
  private _latency = 0;

  // Rate tracking with sliding window.
  private _uploadRate = 0;
  private _downloadRate = 0;
  private readonly _rateWindow = 10000; // 10 second sliding window.
  private readonly _rateUpdateInterval = 1000; // Update rates every second.
  private _bytesSamples: Array<{ timestamp: number; sent: number; received: number }> = [];

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

  public get latency(): number {
    return this._latency;
  }

  public get uptime(): number {
    return this._openTimestamp ? Date.now() - this._openTimestamp : 0;
  }

  public get uploadRate(): number {
    return this._uploadRate;
  }

  public get downloadRate(): number {
    return this._downloadRate;
  }

  public send(message: Message): void {
    invariant(this._ws);
    invariant(this._wsMuxer);
    log('sending...', { peerKey: this._identity.peerKey, payload: protocol.getPayloadType(message) });
    if (this._ws?.protocol.includes(EdgeWebsocketProtocol.V0)) {
      const binary = buf.toBinary(MessageSchema, message);
      if (binary.length > CLOUDFLARE_MESSAGE_MAX_BYTES) {
        log.error('Message dropped because it was too large (>1MB).', {
          byteLength: binary.byteLength,
          serviceId: message.serviceId,
          payload: protocol.getPayloadType(message),
        });
        return;
      }
      this._recordBytes(binary.byteLength, 0);
      this._ws.send(binary);
    } else {
      // For muxer, we need to track the size of the message being sent.
      const binary = buf.toBinary(MessageSchema, message);
      this._recordBytes(binary.byteLength, 0);
      this._wsMuxer.send(message).catch((e) => log.catch(e));
    }
  }

  protected override async _open(): Promise<void> {
    const baseProtocols = [...Object.values(EdgeWebsocketProtocol)];
    this._ws = new WebSocket(
      this._connectionInfo.url.toString(),
      this._connectionInfo.protocolHeader
        ? [...baseProtocols, this._connectionInfo.protocolHeader]
        : [...baseProtocols],
    );
    const muxer = new WebSocketMuxer(this._ws);
    this._wsMuxer = muxer;

    this._ws.onopen = () => {
      if (this.isOpen) {
        log('connected');
        this._openTimestamp = Date.now();
        this._callbacks.onConnected();
        this._scheduleHeartbeats();
        this._scheduleRateCalculation();
      } else {
        log.verbose('connected after becoming inactive', { currentIdentity: this._identity });
      }
    };
    this._ws.onclose = (event) => {
      if (this.isOpen) {
        log.warn('disconnected while being open', { code: event.code, reason: event.reason });
        this._callbacks.onRestartRequired();
        muxer.destroy();
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
      this._lastReceivedMessageTimestamp = Date.now();
      if (event.data === '__pong__') {
        // Calculate latency.
        if (this._pingTimestamp) {
          this._latency = Date.now() - this._pingTimestamp;
          this._pingTimestamp = undefined;
        }
        this._rescheduleHeartbeatTimeout();
        return;
      }
      const bytes = await toUint8Array(event.data);
      this._recordBytes(0, bytes.byteLength);
      if (!this.isOpen) {
        return;
      }

      const message = this._ws?.protocol?.includes(EdgeWebsocketProtocol.V0)
        ? buf.fromBinary(MessageSchema, bytes)
        : muxer.receiveData(bytes);

      if (message) {
        log('received', { from: message.source, payload: protocol.getPayloadType(message) });
        this._callbacks.onMessage(message);
      }
    };
  }

  protected override async _close(): Promise<void> {
    void this._inactivityTimeoutCtx?.dispose().catch(() => {});

    try {
      this._ws?.close();
      this._ws = undefined;
      this._wsMuxer?.destroy();
      this._wsMuxer = undefined;
    } catch (err) {
      if (err instanceof Error && err.message.includes('WebSocket is closed before the connection is established.')) {
        return;
      }
      log.warn('error closing websocket', { err });
    }
  }

  private _scheduleHeartbeats(): void {
    invariant(this._ws);
    scheduleTaskInterval(
      this._ctx,
      async () => {
        // TODO(mykola): use RFC6455 ping/pong once implemented in the browser?
        // Cloudflare's worker responds to this `without interrupting hibernation`. https://developers.cloudflare.com/durable-objects/api/websockets/#setwebsocketautoresponse
        this._pingTimestamp = Date.now();
        this._ws?.send('__ping__');
      },
      SIGNAL_KEEPALIVE_INTERVAL,
    );
    this._pingTimestamp = Date.now();
    this._ws.send('__ping__');
    this._rescheduleHeartbeatTimeout();
  }

  private _rescheduleHeartbeatTimeout(): void {
    if (!this.isOpen) {
      return;
    }
    void this._inactivityTimeoutCtx?.dispose();
    this._inactivityTimeoutCtx = new Context();
    scheduleTask(
      this._inactivityTimeoutCtx,
      () => {
        if (this.isOpen) {
          if (Date.now() - this._lastReceivedMessageTimestamp > SIGNAL_KEEPALIVE_TIMEOUT) {
            log.warn('restart due to inactivity timeout', {
              lastReceivedMessageTimestamp: this._lastReceivedMessageTimestamp,
            });
            this._callbacks.onRestartRequired();
          } else {
            this._rescheduleHeartbeatTimeout();
          }
        }
      },
      SIGNAL_KEEPALIVE_TIMEOUT,
    );
  }

  private _recordBytes(sent: number, received: number): void {
    const now = Date.now();

    // Find if we have a sample for the current second.
    const currentSecond = Math.floor(now / 1000) * 1000;
    const existingSample = this._bytesSamples.find((s) => Math.floor(s.timestamp / 1000) * 1000 === currentSecond);

    if (existingSample) {
      existingSample.sent += sent;
      existingSample.received += received;
    } else {
      this._bytesSamples.push({ timestamp: now, sent, received });
    }
  }

  private _scheduleRateCalculation(): void {
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this._calculateRates();
      },
      this._rateUpdateInterval,
    );
    // Calculate initial rates.
    this._calculateRates();
  }

  private _calculateRates(): void {
    const now = Date.now();
    const cutoff = now - this._rateWindow;

    // Remove old samples.
    this._bytesSamples = this._bytesSamples.filter((s) => s.timestamp > cutoff);

    if (this._bytesSamples.length === 0) {
      this._uploadRate = 0;
      this._downloadRate = 0;
      return;
    }

    // Calculate total bytes and time span.
    let totalSent = 0;
    let totalReceived = 0;
    const oldestTimestamp = Math.min(...this._bytesSamples.map((s) => s.timestamp));
    const timeSpan = (now - oldestTimestamp) / 1000; // Convert to seconds.

    for (const sample of this._bytesSamples) {
      totalSent += sample.sent;
      totalReceived += sample.received;
    }

    // Calculate rates (bytes per second).
    this._uploadRate = timeSpan > 0 ? Math.round(totalSent / timeSpan) : 0;
    this._downloadRate = timeSpan > 0 ? Math.round(totalReceived / timeSpan) : 0;
  }
}
