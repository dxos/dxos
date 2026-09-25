//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { toServiceError } from '@dxos/protocols';
import { requirePublicKey } from '@dxos/protocols/buf';
import {
  type CloseRequest,
  type DetailsRequest,
  type DetailsResponse,
  DetailsResponseSchema,
  type SignalRequest,
  type StatsRequest,
  type StatsResponse,
  StatsResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/rtc_pb';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { type RTCService } from '@dxos/protocols/rpc';
import { ComplexMap } from '@dxos/util';

import { type IceProvider } from '../../signal/index.ts';
import { getRtcConnectionFactory } from './rtc-connection-factory.ts';
import { RtcPeerConnection } from './rtc-peer-connection.ts';
import { type RtcTransportChannel } from './rtc-transport-channel.ts';

type Connection = {
  proxyId: PublicKey;
  channel: RtcTransportChannel;
  channelPort: MessagePort;
};

/**
 * Owns the `RTCPeerConnection` on behalf of a consumer that cannot hold one — in practice the tab
 * serving a worker, since the page is where the network stack lives.
 *
 * The established `RTCDataChannel` is transferred to the consumer over the per-connection
 * `channelPort`, so this side only brokers connection setup: signalling in both directions, then
 * handover. No connection data passes through it, and neither does the flow control that came with
 * relaying every packet.
 */
export class RtcService implements RTCService.Handlers {
  readonly #connections = new ComplexMap<PublicKey, Connection>(PublicKey.hash);
  readonly #connectionFactory = getRtcConnectionFactory();

  'constructor'(
    private readonly _webrtcConfig?: RTCConfiguration,
    private readonly _iceProvider?: IceProvider,
  ) {}

  public 'hasOpenConnections'(): boolean {
    return this.#connections.size > 0;
  }

  ['RTCService.open']({ request, channelPort }: RTCService.OpenRequest): Stream.Stream<Signal, Error> {
    return EffectEx.streamFromEmitter<Signal, Error>((emit) => {
      const proxyId = requirePublicKey(request.proxyId);
      const existing = this.#connections.get(proxyId);
      if (existing) {
        log.error('requesting a new connection for an existing proxy');
        void this.#closeConnection(existing);
      }

      const peerConnection = new RtcPeerConnection(this.#connectionFactory, {
        ownPeerKey: request.ownPeerKey,
        remotePeerKey: request.remotePeerKey,
        legacyInitiator: request.initiator,
        webrtcConfig: this._webrtcConfig,
        iceProvider: this._iceProvider,
        sendSignal: async (signal) => emit.single(signal),
      });

      // No `stream`: the channel is handed over rather than piped here.
      const channel = peerConnection.createTransportChannel({
        initiator: request.initiator,
        topic: request.topic,
        ownPeerKey: request.ownPeerKey,
        remotePeerKey: request.remotePeerKey,
      });

      const connection: Connection = { proxyId, channel, channelPort };
      this.#connections.set(proxyId, connection);

      // Runs in the channel's creation task, the only window in which a browser will transfer it.
      // `lib.dom` omits `RTCDataChannel` from the `Transferable` union, hence the widening.
      channel.channelReady.on((dataChannel) =>
        channelPort.postMessage(dataChannel, [dataChannel as unknown as Transferable]),
      );
      channel.errors.handle((err) => {
        void this.#closeConnection(connection);
        emit.fail(err);
      });
      channel.closed.on(() => {
        void this.#closeConnection(connection);
        emit.end();
      });

      channel.open().catch((err) => {
        void this.#closeConnection(connection);
        emit.fail(err);
      });

      return Effect.promise(() => this.#closeConnection(connection));
    });
  }

  ['RTCService.sendSignal']({ proxyId, signal }: SignalRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const connection = this.#require(proxyId);
        invariant(signal, 'Signal request carries no signal.');
        await connection.channel.onSignal(signal);
      },
      catch: toServiceError,
    });
  }

  ['RTCService.close']({ proxyId }: CloseRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const connection = this.#connections.get(requirePublicKey(proxyId));
        if (connection) {
          await this.#closeConnection(connection);
        }
      },
      catch: toServiceError,
    });
  }

  ['RTCService.getDetails']({ proxyId }: DetailsRequest): Effect.Effect<DetailsResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => create(DetailsResponseSchema, { details: await this.#require(proxyId).channel.getDetails() }),
      catch: toServiceError,
    });
  }

  ['RTCService.getStats']({ proxyId }: StatsRequest): Effect.Effect<StatsResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => create(StatsResponseSchema, { stats: await this.#require(proxyId).channel.getStats() }),
      catch: toServiceError,
    });
  }

  #require(proxyId: DetailsRequest['proxyId']): Connection {
    const connection = this.#connections.get(requirePublicKey(proxyId));
    invariant(connection, 'Unknown proxy.');
    return connection;
  }

  async #closeConnection(connection: Connection): Promise<void> {
    if (this.#connections.get(connection.proxyId) === connection) {
      this.#connections.delete(connection.proxyId);
    }

    try {
      await connection.channel.close();
    } catch (error: any) {
      log.warn('channel close error', { message: error?.message });
    }
    connection.channelPort.close();
    log('closed');
  }
}
