//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { BotContainer, BotController, BotFactory, BotPackageSpecifier } from '@dxos/botkit';
import { Party, Client } from '@dxos/client';
import { Config } from '@dxos/config';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

const signalContext = new MemorySignalManagerContext();

export class Orchestrator {
  private _client: Client | undefined;
  private _botFactoryClient = new BotFactoryClient(new NetworkManager({
    signalManager: new MemorySignalManager(signalContext)
  }));

  private _party: Party | undefined;
  private _config?: Config;
  private _broker?: TestBroker;

  constructor (
    private readonly _botContainer: BotContainer
  ) { }

  get party (): Party {
    assert(this._party);
    return this._party;
  }

  get botFactoryClient (): BotFactoryClient {
    return this._botFactoryClient;
  }

  async initialize () {
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

    this._client = new Client(this._config);
    await this._client.initialize();
    await this._client.halo.createProfile();
    this._party = await this._client.echo.createParty();

    const topic = PublicKey.random();

    const botFactory = new BotFactory({ config: this._config, botContainer: this._botContainer });
    const botController = new BotController(botFactory, new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    }));
    await botController.start(topic);
    await this._botFactoryClient.start(topic);
  }

  async stop () {
    await this._botFactoryClient.botFactory.removeAll();
    await this._botFactoryClient.stop();
    await this._client?.destroy();
    await this._broker?.stop();
  }

  async spawnBot (botPackageSpecifier: BotPackageSpecifier) {
    assert(this._party);
    return await this._botFactoryClient.spawn(botPackageSpecifier, this._party);
  }
}
