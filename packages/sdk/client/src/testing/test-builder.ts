//
// Copyright 2020 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type ClientServices } from '@dxos/client-protocol';
import { ClientServicesHost, type ServiceContextRuntimeParams } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { type LevelDB } from '@dxos/kv-store';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import {
  createIceProvider,
  createRtcTransportFactory,
  MemoryTransportFactory,
  type TransportFactory,
  TransportKind,
} from '@dxos/network-manager';
import { TcpTransportFactory } from '@dxos/network-manager/transport/tcp';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Storage } from '@dxos/random-access-storage';
import { createLinkedPorts, createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';

import { Client } from '../client';
import { type EchoDatabase } from '../echo';
import { ClientServicesProxy, LocalClientServices } from '../services';

export const testConfigWithLocalSignal = new Config({
  version: 1,
  runtime: {
    services: {
      signaling: [
        {
          // TODO(burdon): Port numbers and global consts?
          server: `ws://localhost:${process.env.SIGNAL_PORT ?? 4000}/.well-known/dx/signal`,
        },
      ],
    },
  },
});

/**
 * Client builder supports different configurations, incl. signaling, transports, storage.
 */
// TODO(burdon): Make extensible.
// TODO(burdon): Implement as Resource.
export class TestBuilder {
  private readonly _ctx = new Context({ name: 'TestBuilder' });

  public config: Config;
  public storage?: () => Storage;
  public level?: () => LevelDB;

  _transport: TransportKind;

  // TODO(burdon): Pass in params as object.
  constructor(
    config?: Config,
    public signalManagerContext = new MemorySignalManagerContext(),
    // TODO(nf): Configure better.
    transport = TransportKind.WEB_RTC,
  ) {
    this.config = config ?? new Config();
    this._transport = transport;
  }

  public get ctx() {
    return this._ctx;
  }

  async destroy() {
    await this._ctx.dispose(false); // TODO(burdon): Set to true to check clean shutdown.
  }

  /**
   * Create backend service handlers.
   */
  createClientServicesHost(runtimeParams?: ServiceContextRuntimeParams) {
    const services = new ClientServicesHost({
      config: this.config,
      storage: this?.storage?.(),
      level: this?.level?.(),
      runtimeParams,
      ...this.networking,
    });

    this._ctx.onDispose(() => services.close());
    return services;
  }

  /**
   * Create local services host.
   * @param options - fastPeerPresenceUpdate: enable for faster space-member online/offline status changes.
   */
  createLocalClientServices(options?: { fastPeerPresenceUpdate?: boolean }): LocalClientServices {
    const services = new LocalClientServices({
      config: this.config,
      storage: this?.storage?.(),
      level: this?.level?.(),
      runtimeParams: {
        ...(options?.fastPeerPresenceUpdate
          ? { spaceMemberPresenceAnnounceInterval: 200, spaceMemberPresenceOfflineTimeout: 400 }
          : {}),
        invitationConnectionDefaultParams: { teleport: { controlHeartbeatInterval: 200 } },
      },
      ...this.networking,
    });

    this._ctx.onDispose(() => services.close());
    return services;
  }

  /**
   * Create client/server.
   */
  createClientServer(host: ClientServicesHost = this.createClientServicesHost()): [Client, ProtoRpcPeer<{}>] {
    const [proxyPort, hostPort] = createLinkedPorts();
    const client = new Client({ config: this.config, services: new ClientServicesProxy(proxyPort) });
    const server = createProtoRpcPeer({
      exposed: host.descriptors,
      handlers: host.services as ClientServices,
      port: hostPort,
    });

    this._ctx.onDispose(() => server.close());
    this._ctx.onDispose(() => client.destroy());
    return [client, server];
  }

  /**
   * Get network manager using local shared memory or remote signal manager.
   */
  private get networking() {
    const signals = this.config.get('runtime.services.signaling');
    if (signals) {
      log.info(`using transport ${this._transport}`);
      let transportFactory: TransportFactory;
      switch (this._transport) {
        case TransportKind.WEB_RTC:
          transportFactory = createRtcTransportFactory(
            { iceServers: this.config.get('runtime.services.ice') },
            this.config.get('runtime.services.iceProviders') &&
              createIceProvider(this.config.get('runtime.services.iceProviders')!),
          );
          break;

        case TransportKind.TCP:
          transportFactory = TcpTransportFactory;
          break;

        default:
          throw new Error(`Unsupported transport w/ signalling: ${this._transport}`);
      }

      return {
        signalManager: new WebsocketSignalManager(signals),
        transportFactory,
      };
    }
    // if (this._transport !== TransportKind.MEMORY) {
    // log.warn(`specified transport ${this._transport} but no signalling configured, using memory transport instead`);
    // }

    // Memory transport with shared context.
    return {
      signalManager: new MemorySignalManager(this.signalManagerContext),
      transportFactory: MemoryTransportFactory,
    };
  }
}

export const testSpaceAutomerge = async (createDb: EchoDatabase, checkDb: EchoDatabase = createDb) => {
  const object = create(Expando, {});
  createDb.add(object);
  await checkDb.query({ id: object.id }).first({ timeout: 1000 });

  return { objectId: object.id };
};

export const syncItemsAutomerge = async (db1: EchoDatabase, db2: EchoDatabase) => {
  await testSpaceAutomerge(db1, db2);
  await testSpaceAutomerge(db2, db1);
};

/**
 * @deprecated use `@dxos/client-services/testing` `performInvitation` instead.
 */
export const joinCommonSpace = async ([initialPeer, ...peers]: Client[], spaceKey?: PublicKey): Promise<PublicKey> => {
  const rootSpace = spaceKey ? initialPeer.spaces.get(spaceKey) : await initialPeer.spaces.create();
  invariant(rootSpace, 'Space not found.');

  await Promise.all(
    peers.map(async (peer) => {
      const hostDone = new Trigger<Invitation>();
      const guestDone = new Trigger<Invitation>();

      const hostObservable = rootSpace.share({ authMethod: Invitation.AuthMethod.NONE });
      log('invitation created');
      hostObservable.subscribe(
        (hostInvitation) => {
          switch (hostInvitation.state) {
            case Invitation.State.CONNECTING: {
              const guestObservable = peer.spaces.join(hostInvitation);
              log('invitation accepted');

              guestObservable.subscribe(
                (guestInvitation) => {
                  switch (guestInvitation.state) {
                    case Invitation.State.SUCCESS: {
                      guestDone.wake(guestInvitation);
                      log('invitation guestDone');
                      break;
                    }
                  }
                },
                (err) => raise(err),
              );
              break;
            }

            case Invitation.State.SUCCESS: {
              hostDone.wake(hostInvitation);
              log('invitation hostDone');
            }
          }
        },
        (err) => raise(err),
      );

      await Promise.all([hostDone.wait(), guestDone.wait()]);
    }),
  );

  return rootSpace.key;
};
