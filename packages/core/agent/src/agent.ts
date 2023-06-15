//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import assert from 'node:assert';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import {
  DX_RUNTIME,
  fromHost,
  ClientServices,
  Config,
  Client,
  ClientServicesProvider,
  PublicKey,
  Subscription,
} from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { Credential, AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap } from '@dxos/util';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { ProxyServer, ProxyServerOptions } from './proxy';
import { parseAddress } from './util';

interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}

type ManagedSpace = {
  spaceKey: PublicKey;
  ownerKey?: PublicKey;
  stream?: Stream<Credential>;
  subscription?: Subscription;
  timeframe?: Timeframe;
};

export type AgentOptions = {
  listen: string[];
};

/**
 * The remote agent exposes Client services via multiple transports.
 */
export class Agent {
  private _endpoints: Service[] = [];
  private _client?: Client;
  private _services?: ClientServicesProvider;
  private _subscriptions: ZenObservable.Subscription[] = [];
  private _managedSpaces = new ComplexMap<PublicKey, ManagedSpace>(PublicKey.hash);

  // prettier-ignore
  constructor(
    private readonly _config: Config,
    private readonly _options: AgentOptions
  ) {
    assert(this._config);
  }

  async start() {
    log('starting...');

    // Create client services.
    this._services = fromHost(this._config);
    await this._services.open();

    // Create client.
    this._client = new Client({ config: this._config, services: this._services });
    await this._client.initialize();

    // Global hook for debuggers.
    ((globalThis as any).__DXOS__ ??= {}).host = (this._services as any)._host;

    // Create socket servers.
    this._endpoints = (
      await Promise.all(
        this._options.listen.map(async (address) => {
          let server: Service | null = null;
          const { protocol, path } = parseAddress(address);
          switch (protocol) {
            //
            // Unix socket (accessed via CLI).
            //
            case 'unix': {
              if (!path.startsWith(DX_RUNTIME)) {
                log.warn(`Non-standard address: ${path}`);
              }

              mkdirSync(dirname(path), { recursive: true });
              rmSync(path, { force: true });
              const httpServer = http.createServer();
              httpServer.listen(path);
              server = createServer(this._services!, { server: httpServer });
              await server.open();
              break;
            }

            //
            // Web socket (accessed via browser).
            //
            case 'ws': {
              const { port } = new URL(address);
              server = createServer(this._services!, { port: parseInt(port) });
              await server.open();
              break;
            }

            //
            // HTTP server (accessed via REST API).
            // TODO(burdon): Insecure.
            //
            case 'http': {
              const { port } = new URL(address);
              server = createProxy(this._client!, { port: parseInt(port) });
              await server.open();
              break;
            }

            default: {
              log.error(`Invalid address: ${address}`);
            }
          }

          if (server) {
            log('listening', { address });
            return server;
          }
        }),
      )
    ).filter(Boolean) as Service[];

    // OpenFaaS connector.
    const faasConfig = this._config.values.runtime?.services?.faasd;
    if (faasConfig) {
      const { FaasConnector } = await import('./faas/connector');
      const connector = new FaasConnector(this._services!, faasConfig);
      await connector.open();
      this._endpoints.push(connector);
      log('connector open', { gateway: faasConfig.gateway });
    }

    log('running...');
  }

  async stop() {
    // Close epoch subscriptions.
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
    this._managedSpaces.forEach((space) => {
      space.stream?.close();
      space.subscription?.();
    });
    this._managedSpaces.clear();

    // Close service endpoints.
    await Promise.all(this._endpoints.map((server) => server.close()));
    this._endpoints = [];

    // Close client.
    await this._client?.destroy();
    this._client = undefined;

    // Close service.
    await this._services?.close();
    this._services = undefined;

    ((globalThis as any).__DXOS__ ??= {}).host = undefined;
  }

  // TODO(burdon): Factor out.
  async manageEpochs() {
    assert(this._client);

    this._subscriptions.push(
      this._client.spaces.subscribe((spaces) => {
        spaces.forEach((space) => {
          if (!this._managedSpaces.has(space.key)) {
            const stream = this._services!.services.SpacesService!.queryCredentials({ spaceKey: space.key });
            stream.subscribe(async (credential) => {
              assert(this._client);
              // TODO(burdon): Eventually test we have the credential to be the leader.
              switch (credential.subject.assertion['@type']) {
                case 'dxos.halo.credentials.AdmittedFeed': {
                  if (!info.ownerKey && credential.subject.assertion.designation === AdmittedFeed.Designation.CONTROL) {
                    info.ownerKey = credential.subject.assertion.identityKey;
                    if (info.ownerKey?.equals(this._client.halo.identity.get()!.identityKey)) {
                      // TODO(burdon): Subscribe to event instead?
                      const result = space.db.query();
                      info.subscription = result.subscribe(async (result) => {
                        // TODO(burdon): Get and compare current timeframe.
                        console.log('update', {
                          space: space.key,
                          totalDataTimeframe: space.internal.data.pipeline?.totalDataTimeframe,
                        });

                        const triggerEpoch = false;
                        if (triggerEpoch) {
                          await this._services!.services.SpacesService!.createEpoch({ spaceKey: space.key });
                        }
                      });
                    }
                  }
                  break;
                }

                // TODO(burdon): Watch for epochs (current/target/total?)
                case 'dxos.halo.credentials.Epoch': {
                  info.timeframe = credential.subject.assertion.timeframe;
                  console.log('>>>', space.internal.data.pipeline);
                  break;
                }
              }
            });

            const info: ManagedSpace = {
              spaceKey: space.key,
              stream,
            };

            this._managedSpaces.set(space.key, info);
          }
        });
      }),
    );
  }
}

const createServer = (services: ClientServicesProvider, options: WebSocket.ServerOptions) => {
  return new WebsocketRpcServer<{}, ClientServices>({
    ...options,
    onConnection: async () => {
      let start = 0;
      const connection = PublicKey.random().toHex();
      return {
        exposed: services.descriptors,
        handlers: services.services as ClientServices,
        onOpen: async () => {
          start = Date.now();
          log('open', { connection });
        },
        onClose: async () => {
          log('close', { connection, time: Date.now() - start });
        },
      };
    },
  });
};

const createProxy = (client: Client, options: ProxyServerOptions) => {
  return new ProxyServer(client, options);
};
