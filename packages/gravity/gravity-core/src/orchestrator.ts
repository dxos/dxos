//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { spawn } from 'child_process';
import debug from 'debug';
import path from 'path';
import kill from 'tree-kill';

import { promiseTimeout } from '@dxos/async';
import { BotFactoryClient } from '@dxos/botkit-client';
import { Client } from '@dxos/client';
import { Invitation } from '@dxos/credentials';
import { SIGNATURE_LENGTH, keyToBuffer, createKeyPair, keyToString, verify, sha256 } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { SpawnOptions } from '@dxos/protocol-plugin-bot';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import { Agent } from './agent';
import { FACTORY_OUT_DIR, getTestConfig, mapConfigToEnv } from './config';
import { buildAndPublishBot } from './distributor';

const log = debug('dxos:testing');

const ORCHESTRATOR_NAME = 'Test';

const FACTORY_START_TIMEOUT = 5 * 1000;

export const NODE_ENV = 'node';
export const BROWSER_ENV = 'browser';

// Get Id information of bot.
// Important: this regulates how often bot gets downloaded from ipfs.
const testTime = Date.now();
const getBotIdentifiers = (botPath: string, env: string | undefined) => {
  const name = `wrn://dxos/bot/${env}/${path.basename(botPath)}`; // TODO(burdon): dxn.
  const id = sha256(`${name}${testTime}`);
  return { id, name };
};

// TODO(burdon): Comment.
export class Orchestrator {
  static async create (options: {local: boolean}) {
    const config = await getTestConfig();
    return new Orchestrator(config, options);
  }

  _builds = new Map();
  _client: Client;
  _localRun: boolean;
  _party: Party;
  _factoryClient: BotFactoryClient;
  _factory: any;
  _config: any;

  constructor (config: any, options: {local: boolean}) {
    this._config = config;

    const { local = true } = options;
    this._client = new Client(this._config);
    this._localRun = local;
  }

  async start () {
    await this._client.initialize();

    const { publicKey, secretKey } = createKeyPair();
    const username = ORCHESTRATOR_NAME;

    await this._client.halo.createProfile({ publicKey, secretKey, username });

    // Create control party.
    this._party = await this._client.echo.createParty();

    // Start BotFactory.
    // TODO(egorgripasov): Generally, we might want to use a set of already running factories.
    // This could be turned into the list as well;
    this._factory = await this._startBotFactory();
    this._factoryClient = new BotFactoryClient(this._client.echo.networkManager, this._factory.topic);
  }

  get client () {
    return this._client;
  }

  get party () {
    return this._party;
  }

  get botFactoryPid () {
    return this._factory.process.pid;
  }

  async startAgent (options: SpawnOptions) {
    const { env = NODE_ENV, botPath, ...rest } = options;

    assert(botPath);
    assert(path.isAbsolute(botPath), 'Bot path must be absolute');

    if (this._localRun) {
      options = {
        ...rest,
        botPath
      };
    } else {
      const buildId = `${botPath}-${env}`;
      let ipfsCID = this._builds.get(buildId);
      if (!ipfsCID) {
        log('Building & publishing bot package...');
        ipfsCID = await buildAndPublishBot(this._config.get('services.ipfs.gateway'), botPath, env === 'browser');
        this._builds.set(buildId, ipfsCID);
      }
      options = {
        ...rest,
        env,
        ipfsCID,
        ipfsEndpoint: this._config.get('services.ipfs.gateway')
      };
    }

    log('Sending spawn bot command...');
    const botId = await this._spawnBot(botPath, options);

    assert(botId);
    await this._inviteBot(botId);

    return new Agent(this._factoryClient, botId);
  }

  async destroy () {
    kill(this._factory.process.pid, 'SIGKILL');
    await this._factoryClient.close();
    await this._client.destroy();
  }

  async _startBotFactory (): Promise<any> {
    const doStart = async (): Promise<any> => {
      const { publicKey, secretKey } = createKeyPair();

      const topic = keyToString(publicKey);

      const env = {
        ...process.env,
        NODE_OPTIONS: '',
        ...mapConfigToEnv(this._config),
        DEBUG: `bot-factory,bot-factory:*,dxos:botkit*,dxos:testing*,${process.env.DEBUG}`,
        DX_BOT_RESET: 'true',
        DX_BOT_TOPIC: topic,
        DX_BOT_SECRET_KEY: keyToString(secretKey),
        DX_BOT_LOCAL_DEV: this._localRun.toString(),
        DX_BOT_DUMP_FILE: path.join(FACTORY_OUT_DIR, topic)
      };

      const factory = spawn('node', [path.join(__dirname, './bot-factory.js')], { env });

      factory.stderr.pipe(process.stderr);
      factory.stdout.pipe(process.stdout);

      await new Promise<void>(resolve => {
        factory.stdout.on('data', (data: Buffer) => {
          if (/"started":true/.test(data.toString())) {
            log('Bot Factory started.');
            resolve();
          }
        });
      });

      return {
        topic,
        process: factory
      };
    };

    return promiseTimeout(doStart(), FACTORY_START_TIMEOUT, new Error(`Failed to start bot factory: Timed out in ${FACTORY_START_TIMEOUT} ms.`));
  }

  async _spawnBot (botPath: string, options: SpawnOptions) {
    const { env } = options;
    const botId = await this._factoryClient.sendSpawnRequest(undefined, {
      ...getBotIdentifiers(botPath, env),
      ...options
    });

    log(`Test Bot ${botId} spawned.`);

    return botId;
  }

  // TODO(egorgripasov): Takes non-defined time; wait for node to appear in control party?
  async _inviteBot (botId: string) {
    const secretValidator = async (invitation: Invitation, secret: Buffer) => {
      const signature = secret.slice(0, SIGNATURE_LENGTH);
      const message = secret.slice(SIGNATURE_LENGTH);
      return verify(message, signature, keyToBuffer(this._factory.topic));
    };

    const invitation = await this._party.createInvitation({ secretValidator });

    await this._factoryClient.sendInvitationRequest(botId, this._party.key.toHex(), {}, invitation.toQueryParameters());

    log(`Bot ${botId} invited.`);
  }
}
