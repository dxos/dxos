//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import assert from 'node:assert';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { fromHost, ClientServices, Config, Client, ClientServicesProvider, PublicKey } from '@dxos/client';
import { checkCredentialType, SpecificCredential } from '@dxos/credentials';
import { log } from '@dxos/log';
import { Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { ProxyServer, ProxyServerOptions } from './proxy';
import { Service } from './service';
import { lockFilePath, parseAddress } from './util';

type CurrentEpoch = {
  spaceKey: PublicKey;
  ownerKey?: PublicKey;
  currentEpoch?: SpecificCredential<Epoch>;
  nextEpoch?: SpecificCredential<Epoch>;
};

type EpochOptions = {
  limit?: number;
};

const DEFAULT_EPOCH_LIMIT = 10_000;

export type AgentOptions = {
  profile: string;
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
  private _managedSpaces = new ComplexMap<PublicKey, CurrentEpoch>(PublicKey.hash);

  // prettier-ignore
  constructor(
    private readonly _config: Config,
    private readonly _options: AgentOptions
  ) {
    assert(this._config);
  }

  // TODO(burdon): Lock file (per profile). E.g., isRunning is false if running manually.
  //  https://www.npmjs.com/package/lockfile

  async start() {
    // Create client services.
    // TODO(burdon): Check lock.
    this._services = fromHost(this._config, { lockKey: lockFilePath(this._options.profile) });
    await this._services.open();

    // Create client.
    // TODO(burdon): Move away from needing client for epochs and proxy?
    this._client = new Client({ config: this._config, services: this._services });
    await this._client.initialize();

    // Global hook for debuggers.
    ((globalThis as any).__DXOS__ ??= {}).host = (this._services as any)._host;

    // Create socket servers.
    let socketUrl: string | undefined;
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
              socketUrl = address;
              mkdirSync(dirname(path), { recursive: true });
              rmSync(path, { force: true });
              const httpServer = http.createServer();
              httpServer.listen(path);
              server = createServer(this._services!, { server: httpServer });
              await server.open();
              break;
            }

            //
            // Web socket (accessed via devtools).
            // TODO(burdon): Insecure.
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
    // TODO(burdon): Manual trigger.
    const faasConfig = this._config.values.runtime?.services?.faasd;
    if (faasConfig) {
      const { FaasConnector } = await import('./faas/connector');
      const connector = new FaasConnector(this._services!, faasConfig, { clientUrl: socketUrl });
      await connector.open();
      this._endpoints.push(connector);
      log('connector open', { gateway: faasConfig.gateway });
    }

    log('running...');
  }

  async stop() {
    // Close epoch subscriptions.
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
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

  // TODO(burdon): Subscribe to space members to update address book.

  /**
   * Monitor all epochs for which the agent is the leader.
   */
  // TODO(burdon): Factor out.
  async monitorEpochs(options: EpochOptions) {
    log('listening...');
    assert(this._client);
    this._subscriptions.push(
      this._client.spaces.subscribe((spaces) => {
        spaces.forEach(async (space) => {
          if (!this._managedSpaces.has(space.key)) {
            const current: CurrentEpoch = {
              spaceKey: space.key,
            };
            this._managedSpaces.set(space.key, current);

            setTimeout(async () => {
              await space.waitUntilReady();

              // Listen for epochs.
              const limit = options.limit ?? DEFAULT_EPOCH_LIMIT;
              space.pipeline.subscribe(async (pipeline) => {
                assert(checkCredentialType(pipeline.currentEpoch!, 'dxos.halo.credentials.Epoch'));
                const timeframe = pipeline.currentEpoch?.subject.assertion.timeframe;
                const epochMessages = timeframe.totalMessages();
                const totalMessages = pipeline.currentDataTimeframe?.totalMessages() ?? 0;
                log('update', { space: space.key, epochMessages, totalMessages });

                const triggerEpoch = totalMessages - epochMessages >= limit;
                if (triggerEpoch) {
                  log('trigger epoch', { space: space.key });
                  // current.lastEpochCredential = undefined; // Reset to prevent triggering until new epoch processed.
                  // await this._services!.services.SpacesService!.createEpoch({ spaceKey: space.key });
                }
              });
            });
          }
        });
      }),
    );
  }

  /*
  monitorEpoch(space: Space, { limit: _limit }: EpochOptions): CurrentEpoch {
    // const stream = this._services!.services.SpacesService!.queryCredentials({ spaceKey: space.key });
    // setTimeout(async () => {
    // TODO(burdon): Confirm all epochs have been processed.
    await space.waitUntilReady();
    log('ready', { space: space.key });

      stream.subscribe(async (credential) => {
        assert(this._client);
        switch (credential.subject.assertion['@type']) {
          // TODO(burdon): Update address book.

          // TODO(burdon): Eventually test we have the credential to be leader.
          case 'dxos.halo.credentials.AdmittedFeed': {
            if (!info.ownerKey && credential.subject.assertion.designation === AdmittedFeed.Designation.CONTROL) {
              info.ownerKey = credential.subject.assertion.identityKey;
              if (info.ownerKey?.equals(this._client.halo.identity.get()!.identityKey)) {
                log('leader', { space: space.key, limit });

                // TODO(burdon): Don't trigger until processed last epoch.
                info.pipelineSubscription = space.pipeline.subscribe(async (pipeline) => {
                  if (info.lastEpochCredential) {
                    const timeframe = info.lastEpochCredential?.subject.assertion.timeframe;
                    const epochMessages = timeframe.totalMessages();
                    const totalMessages = pipeline.currentDataTimeframe?.totalMessages() ?? 0;
                    log('update', { space: space.key, epochMessages, totalMessages });

                    const triggerEpoch = totalMessages - epochMessages >= limit;
                    if (triggerEpoch) {
                      log('trigger epoch', { space: space.key });
                      info.lastEpochCredential = undefined; // Reset to prevent triggering until new epoch processed.
                      await this._services!.services.SpacesService!.createEpoch({ spaceKey: space.key });
                    }
                  }
                });
              }
            }
            break;
          }

          case 'dxos.halo.credentials.Epoch': {
            assert(checkCredentialType(credential, 'dxos.halo.credentials.Epoch'));
            info.lastEpochCredential = credential;
            const timeframe = info.lastEpochCredential?.subject.assertion.timeframe;
            log('epoch', {
              spaceKey: space.key,
              timeframe,
              totalMessages: timeframe.totalMessages(),
            });
            break;
          }
        }
      });
    });

    const info: CurrentEpoch = {
      spaceKey: space.key,
      // stream,
    };

    return info;
  }
  */
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
