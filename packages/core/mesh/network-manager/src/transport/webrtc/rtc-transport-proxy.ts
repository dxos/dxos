//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Cause from 'effect/Cause';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ConnectivityError } from '@dxos/protocols';
import { fromPublicKey } from '@dxos/protocols/buf';
import {
  CloseRequestSchema,
  ConnectionRequestSchema,
  DetailsRequestSchema,
  SignalRequestSchema,
  StatsRequestSchema,
} from '@dxos/protocols/buf/dxos/mesh/rtc_pb';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { type RTCService } from '@dxos/protocols/rpc';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from '../transport.ts';
import { bindDataChannel } from './rtc-data-channel.ts';

const RPC_TIMEOUT = '10 seconds' as const;
/** Above {@link RPC_TIMEOUT}, since a close queues behind the host's own peer-connection teardown
 * in a tab the browser may be throttling as a background page. */
const CLOSE_RPC_TIMEOUT = '15 seconds' as const;

export type RtcTransportProxyOptions = TransportOptions & {
  rtcService: RTCService.Client;
};

/**
 * A transport whose `RTCPeerConnection` lives in another thread (the tab), reached over effect-rpc.
 *
 * Only signalling crosses the rpc boundary: once the remote side hands over the `RTCDataChannel` it
 * is transferred into this thread, and the wire protocol reads and writes it directly.
 */
export class RtcTransportProxy extends Resource implements Transport {
  private readonly _proxyId = PublicKey.random();

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private _events: Fiber.Fiber<void, never> | undefined;
  private _unbind: (() => void) | undefined;
  /** The service transfers the established `RTCDataChannel` over this channel's other end. */
  private _handover: MessageChannel | undefined;

  constructor(private readonly _options: RtcTransportProxyOptions) {
    super();
  }

  protected override async _open(): Promise<void> {
    const handover = new MessageChannel();
    this._handover = handover;
    handover.port1.onmessage = ({ data }: MessageEvent<RTCDataChannel>) => this._bindChannel(data);
    handover.port1.start();

    this._events = this._options.rtcService['RTCService.open']({
      request: create(ConnectionRequestSchema, {
        proxyId: fromPublicKey(this._proxyId),
        remotePeerKey: this._options.remotePeerKey,
        ownPeerKey: this._options.ownPeerKey,
        topic: this._options.topic,
        initiator: this._options.initiator ?? false,
      }),
      channelPort: handover.port2,
    }).pipe(
      Stream.runForEach((signal) => Effect.promise(() => this._handleSignal(signal))),
      // `matchCause`, not `match`: a defect in the rpc transport would otherwise leave the fiber
      // dead and the transport waiting forever for a connection that can never arrive.
      Effect.matchCause({
        // The stream ends when the remote connection closes.
        onSuccess: () => void this.close(),
        onFailure: (cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return;
          }
          const error = Cause.squash(cause);
          this._raiseIfOpen(error instanceof Error ? error : new Error(String(error)));
        },
      }),
      Effect.runFork,
    );
  }

  protected override async _close(): Promise<void> {
    this._teardown();

    try {
      await this._run(
        this._options.rtcService['RTCService.close'](
          create(CloseRequestSchema, { proxyId: fromPublicKey(this._proxyId) }),
        ),
        CLOSE_RPC_TIMEOUT,
      );
    } catch (err: any) {
      log.catch(err);
    }

    this.closed.emit();
  }

  async onSignal(signal: Signal): Promise<void> {
    this._run(
      this._options.rtcService['RTCService.sendSignal'](
        create(SignalRequestSchema, { proxyId: fromPublicKey(this._proxyId), signal }),
      ),
    ).catch((err) => this._raiseIfOpen(err));
  }

  async getDetails(): Promise<string> {
    try {
      const response = await this._run(
        this._options.rtcService['RTCService.getDetails'](
          create(DetailsRequestSchema, { proxyId: fromPublicKey(this._proxyId) }),
        ),
      );
      return response.details;
    } catch (err) {
      return 'rtc-svc unreachable';
    }
  }

  async getStats(): Promise<TransportStats | undefined> {
    try {
      const response = await this._run(
        this._options.rtcService['RTCService.getStats'](
          create(StatsRequestSchema, { proxyId: fromPublicKey(this._proxyId) }),
        ),
      );
      return response.stats as TransportStats | undefined;
    } catch (err) {
      log('transport stats unavailable', { err });
      return undefined;
    }
  }

  /**
   * Called when the underlying proxy service becomes unavailable.
   */
  forceClose(): void {
    this._teardown();
    this.closed.emit();
  }

  private _teardown(): void {
    this._events?.interruptUnsafe();
    this._events = undefined;
    this._unbind?.();
    this._unbind = undefined;
    this._handover?.port1.close();
    this._handover = undefined;
  }

  private _bindChannel(channel: RTCDataChannel): void {
    if (!this.isOpen) {
      log.verbose('channel handed over after the transport was closed');
      channel.close();
      return;
    }

    this._unbind = bindDataChannel(channel, this._options.stream, {
      onOpen: () => this.connected.emit(),
      onClose: () => this.close().then(() => {}),
      onError: (error) => this._raiseIfOpen(error),
    });
  }

  private async _handleSignal(signal: Signal): Promise<void> {
    invariant(signal, 'Signal event carries no payload.');
    try {
      await this._options.sendSignal(signal);
    } catch (error) {
      const type = signalType(signal);
      if (type === 'offer' || type === 'answer') {
        this._raiseIfOpen(
          new ConnectivityError({ message: `Session establishment failed: ${type} couldn't be sent.` }),
        );
      }
    }
  }

  private _run<A>(effect: Effect.Effect<A, Error>, timeout: Duration.Input = RPC_TIMEOUT): Promise<A> {
    return EffectEx.runPromise(effect.pipe(Effect.timeout(timeout), Effect.orDie));
  }

  private _raiseIfOpen(error: any): void {
    if (this.isOpen) {
      this.errors.raise(error);
    } else {
      log.info('error swallowed because transport was closed', { message: error.message });
    }
  }
}

export class RtcTransportProxyFactory implements TransportFactory {
  private _rtcService: RTCService.Client | undefined;
  private _connections = new Set<RtcTransportProxy>();

  /**
   * Sets the current service to be used to open connections.
   * Calling this method will close any existing connections.
   */
  setRtcService(rtcService: RTCService.Client | undefined): this {
    this._rtcService = rtcService;
    for (const connection of this._connections) {
      connection.forceClose();
    }
    return this;
  }

  createTransport(options: TransportOptions): Transport {
    invariant(this._rtcService, 'RtcTransportProxyFactory is not ready to open connections');
    const transport = new RtcTransportProxy({ ...options, rtcService: this._rtcService });
    this._connections.add(transport);
    transport.closed.on(() => {
      this._connections.delete(transport);
    });
    return transport;
  }
}

/** The SDP type inside a signal's opaque `Struct` payload, where it names one. */
const signalType = (signal: Signal): unknown => {
  const data = signal.payload?.data;
  return typeof data === 'object' && data !== null && !Array.isArray(data) ? data.type : undefined;
};
