//
// Copyright 2020 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type ClientServices } from '@dxos/client-protocol';
import { ClientServicesHost } from '@dxos/client-services';
import { type ServiceContextRuntimeParams } from '@dxos/client-services/src';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { type MyLevel } from '@dxos/echo-pipeline';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import * as E from '@dxos/echo-schema';
import { Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import {
  MemoryTransportFactory,
  TcpTransportFactory,
  TransportKind,
  createLibDataChannelTransportFactory,
  createSimplePeerTransportFactory,
  type TransportFactory,
} from '@dxos/network-manager';
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
export class TestBuilder {
  private readonly _ctx = new Context();

  public config: Config;
  public storage?: Storage;
  public level?: MyLevel;

  _transport: TransportKind;

  // prettier-ignore
  constructor (
    config?: Config,
    public signalManagerContext = new MemorySignalManagerContext(),
    // TODO(nf): configure better
    transport = process.env.MOCHA_ENV === 'nodejs' ? TransportKind.LIBDATACHANNEL : TransportKind.SIMPLE_PEER,
  ) {
    this.config = config ?? new Config();
    this._transport = transport;
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
        case TransportKind.SIMPLE_PEER:
          transportFactory = createSimplePeerTransportFactory({
            iceServers: this.config.get('runtime.services.ice'),
          });
          break;
        case TransportKind.LIBDATACHANNEL:
          transportFactory = createLibDataChannelTransportFactory({
            iceServers: this.config.get('runtime.services.ice'),
          });
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

  /**
   * Create backend service handlers.
   */
  async createClientServicesHost(runtimeParams?: ServiceContextRuntimeParams) {
    const level = this.level ?? (await createTestLevel());
    const services = new ClientServicesHost({
      config: this.config,
      storage: this.storage,
      level,
      runtimeParams,
      ...this.networking,
    });
    this._ctx.onDispose(async () => {
      await level.close();
      await services.close();
    });
    return services;
  }

  /**
   * Create local services host.
   */
  async createLocal() {
    const level = this.level ?? (await createTestLevel());
    const services = new LocalClientServices({
      config: this.config,
      storage: this.storage,
      level,
      ...this.networking,
    });
    this._ctx.onDispose(async () => {
      await level.close();
      await services.close();
    });
    return services;
  }

  /**
   * Create client/server.
   */
  async createClientServer(host?: ClientServicesHost): Promise<[Client, ProtoRpcPeer<{}>]> {
    host ??= await this.createClientServicesHost();
    const [proxyPort, hostPort] = createLinkedPorts();
    const server = createProtoRpcPeer({
      exposed: host.descriptors,
      handlers: host.services as ClientServices,
      port: hostPort,
    });
    this._ctx.onDispose(() => server.close());

    // TODO(dmaretskyi): Refactor.

    const client = new Client({ config: this.config, services: new ClientServicesProxy(proxyPort) });
    this._ctx.onDispose(() => client.destroy());
    return [client, server];
  }

  async destroy() {
    void this._ctx.dispose();
    await this.level?.close();
  }
}

export const testSpaceAutomerge = async (create: EchoDatabase, check: EchoDatabase = create) => {
  const object = E.object(Expando, {});

  create.add(object);

  await check.automerge.loadObjectById(object.id, { timeout: 1000 });

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
