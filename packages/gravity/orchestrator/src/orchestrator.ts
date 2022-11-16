//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { BotContainer, BotController, BotFactory, BotPackageSpecifier } from '@dxos/botkit';
import { Space, Client } from '@dxos/client';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

const signalContext = new MemorySignalManagerContext();

export class Orchestrator {
  private _client: Client | undefined;
  private _botFactoryClient = new BotFactoryClient(
    new NetworkManager({
      signalManager: new MemorySignalManager(signalContext),
      transportFactory: MemoryTransportFactory
    })
  );

  private _space: Space | undefined;
  private _config?: Config;
  private _broker?: TestBroker;

  constructor(private readonly _botContainer: BotContainer) {}

  get space(): Space {
    assert(this._space);
    return this._space;
  }

  get botFactoryClient(): BotFactoryClient {
    return this._botFactoryClient;
  }

  async initialize() {
    const port = randomInt(40000, 10000);
    this._broker = await createTestBroker(port);
    this._config = new Config({
      version: 1,
      runtime: {
        services: {
          signal: {
            server: this._broker.url()
          }
        }
      }
    });

    this._client = new Client({ config: this._config });
    await this._client.initialize();
    await this._client.halo.createProfile();
    this._space = await this._client.echo.createSpace();

    const topic = PublicKey.random();

    const botFactory = new BotFactory({
      config: this._config,
      botContainer: this._botContainer
    });
    const botController = new BotController(
      botFactory,
      new NetworkManager({
        signalManager: new MemorySignalManager(signalContext),
        transportFactory: MemoryTransportFactory
      })
    );
    await botController.start(topic);
    await this._botFactoryClient.start(topic);
  }

  async stop() {
    await this._botFactoryClient.botFactory.removeAll();
    await this._botFactoryClient.stop();
    await this._client?.destroy();
    await this._broker?.stop();
  }

  async spawnBot(botPackageSpecifier: BotPackageSpecifier) {
    assert(this._space);
    return await this._botFactoryClient.spawn(botPackageSpecifier, this._space);
  }
}
