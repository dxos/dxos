//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { BotContainer, BotController, BotFactory, BotPackageSpecifier } from '@dxos/botkit';
import { Client, Party } from '@dxos/client';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';
import { NetworkManager } from '@dxos/network-manager';

export class Orchestrator {
  private _client: Client | undefined;
  private _botFactoryClient = new BotFactoryClient(new NetworkManager());
  private _botContainer: BotContainer;
  private _party: Party | undefined;

  constructor (botContainer: BotContainer) {
    this._botContainer = botContainer;
  }

  get party (): Party {
    assert(this._party);
    return this._party;
  }

  get botFactoryClient (): BotFactoryClient {
    return this._botFactoryClient;
  }

  async initialize () {
    this._client = new Client();
    await this._client.initialize();
    await this._client.halo.createProfile();
    this._party = await this._client.echo.createParty();

    const topic = PublicKey.random();

    const botFactory = new BotFactory({ config: new Config({}), botContainer: this._botContainer });
    const botController = new BotController(botFactory, new NetworkManager());
    await botController.start(topic);
    await this._botFactoryClient.start(topic);
  }

  async stop () {
    await this._botFactoryClient.botFactory.removeAll();
    await this._botFactoryClient.stop();
    await this._client?.destroy();
  }

  async spawnBot (botPackageSpecifier: BotPackageSpecifier) {
    assert(this._party);
    return await this._botFactoryClient.spawn(botPackageSpecifier, this._party);
  }
}
