//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { Chance } from 'chance';
import debug from 'debug';
import fs, { ensureFileSync } from 'fs-extra';
import yaml from 'js-yaml';
import get from 'lodash.get';
import moment from 'moment';
import path from 'path';

import { Client } from '@dxos/client';
import { keyToString, keyToBuffer, createKeyPair, sha256, PublicKey } from '@dxos/crypto';
import { StarTopology, transportProtocolProvider } from '@dxos/network-manager';
import {
  COMMAND_SIGN,
  MESSAGE_CONFIRM,
  BOT_EVENT,
  BotPlugin,
  createInvitationMessage,
  createSignResponse,
  createBotCommand,
  SpawnOptions
} from '@dxos/protocol-plugin-bot';
import { Registry } from '@wirelineio/registry-client';

import { BOT_CONFIG_FILENAME } from './config';
import { BotContainer } from './containers/common';
import { NATIVE_ENV, getBotCID } from './env';
import { log } from './log';
import { BOT_PACKAGE_DOWNLOAD_DIR, SourceManager } from './source-manager';

const chance = new Chance();

const logInfo = debug('dxos:botkit');

// File where information about running bots is stored.
export const BOTS_DUMP_FILE = 'out/factory-state';

export type BotId = string;

export interface BotInfo {
  botId: BotId
  id: string
  installDirectory: string
  storageDirectory: string
  spawnOptions: SpawnOptions
  parties: string[]
  started: any
  lastActive: any
  stopped: boolean
  name: string
  recordName: string
  env: string
}

interface Options {
  signChallenge: (message: any) => any
  emitBotEvent: (event: any) => Promise<void>
}

/**
 * Manages bot instances; provides bot lifecycle operations.
 */
export class BotManager {
  private readonly _bots = new Map<string, BotInfo>();

  // TODO(egorgripasov): Merge to _bots.
  private readonly _connectedBots: Record<string, boolean> = {};

  private readonly _config: any;
  private readonly _botContainers: Record<string, BotContainer>;
  private readonly _client: Client;
  private readonly _signChallenge: (message: any) => any;
  private readonly _emitBotEvent: (event: any) => Promise<void>;
  private readonly _localDev: boolean;
  private readonly _botsFile: string;
  private readonly _registry: any;
  private readonly _sourceManager: SourceManager;

  /**
   * Topic for communications between bots and bot-manager.
   */
  private readonly _controlTopic: Buffer;
  private readonly _controlPeerKey: Buffer;

  private _plugin?: any;
  private _leaveControlSwarm?: () => void;

  constructor (config: any, botContainers: Record<string, BotContainer>, client: Client, options: Options) {
    this._config = config;
    this._botContainers = botContainers;
    this._client = client;

    const { signChallenge, emitBotEvent } = options;
    this._signChallenge = signChallenge;
    this._emitBotEvent = emitBotEvent;

    this._localDev = this._config.get('bot.localDev');
    this._botsFile = path.join(process.cwd(), this._config.get('bot.dumpFile', BOTS_DUMP_FILE));

    this._registry = new Registry(this._config.get('services.wns.server'), this._config.get('services.wns.chainId'));

    ensureFileSync(this._botsFile);

    for (const container of Object.values(this._botContainers)) {
      container.botExit.on(async ({ botId, exitCode }) => {
        const botInfo = this._bots.get(botId);
        if (!exitCode && botInfo) {
          botInfo.stopped = true;
          await this._saveBotsToFile();
        }
      });
    }

    this._controlTopic = createKeyPair().publicKey;
    this._controlPeerKey = this._controlTopic;

    this._sourceManager = new SourceManager(config);
  }

  get controlTopic () {
    return this._controlTopic;
  }

  async start () {
    this._plugin = new BotPlugin(this._controlPeerKey, (protocol: any, message: any) => this._botMessageHandler(protocol, message));
    // Join control swarm.
    this._leaveControlSwarm = await this._client.networkManager.joinProtocolSwarm({
      topic: PublicKey.from(this._controlTopic),
      protocol: transportProtocolProvider(this._controlTopic, this._controlPeerKey, this._plugin),
      peerId: PublicKey.from(this._controlPeerKey),
      topology: new StarTopology(PublicKey.from(this._controlPeerKey))
    });

    await this._readBotsFromFile();

    const reset = this._config.get('bot.reset');
    if (reset) {
      await this.killAllBots();
    } else {
      for await (const { botId, stopped } of this._bots.values()) {
        if (!stopped) {
          await this._startBot(botId);
        }
      }
    }
  }

  /**
   * Spawn bot instance.
   */
  async spawnBot (botName: string | undefined, options: SpawnOptions = {}) {
    let { ipfsCID, env = NATIVE_ENV, name: displayName, id } = options;
    assert(botName || ipfsCID || this._localDev);

    if (!ipfsCID) {
      const botRecord = await this._getBotRecord(botName);
      if (!this._localDev) {
        ipfsCID = getBotCID(botRecord, env);
      }

      if (!displayName) {
        displayName = get(botRecord, 'attributes.name');
      }

      if (!id) {
        id = get(botRecord, 'id');
      }
    }

    log(`Spawn bot request for ${botName || ipfsCID || displayName} env: ${env}`);

    if (this._botContainers[env] === undefined) {
      throw new Error(`Unknown env ${env}. Available envs are: ${Object.keys(this._botContainers)}`);
    }

    assert(id, 'Invalid Bot Id.');
    assert(displayName, 'Invalid Bot Name.');

    const botId = keyToString(createKeyPair().publicKey);
    const name = `bot:${displayName} ${chance.animal()}`;

    const installDirectory = await this._sourceManager.downloadAndInstallBot(id, ipfsCID, options);
    assert(installDirectory, `Invalid install directory for bot: ${botName || ipfsCID}`);

    this._bots.set(botId, {
      botId,
      id,
      recordName: botName || id,
      installDirectory,
      storageDirectory: path.join(process.cwd(), '.bots', botId),
      spawnOptions: options,
      parties: [],
      stopped: false,
      name,
      env,
      started: 0,
      lastActive: 0
    });

    return this._startBot(botId);
  }

  /**
   * @param botId Unique Bot ID.
   */
  async stopBot (botId: string) {
    await this._stopBot(botId, true);
  }

  /**
   * @param botId Unique Bot ID.
   */
  async killBot (botId: string) {
    const botInfo = this._bots.get(botId);
    assert(botInfo, 'Invalid Bot Id');

    await this._botContainers[botInfo.env].stopBot(botInfo);
    await fs.remove(botInfo.storageDirectory);
    this._bots.delete(botId);
    await this._saveBotsToFile();

    log(`Bot '${botId}' removed from Bot Container.`);
  }

  async killAllBots () {
    for await (const botInfo of this._bots.values()) {
      if (this._botContainers[botInfo.env]) {
        await this._botContainers[botInfo.env].stopBot(botInfo);
        await fs.remove(botInfo.storageDirectory);
      }
    }
    this._bots.clear();
    await this._saveBotsToFile();
  }

  /**
   * @param botId Unique Bot ID.
   */
  async restartBot (botId: string) {
    await this._stopBot(botId);
    await this._startBot(botId);
  }

  async restartBots () {
    for await (const { botId } of this._bots.values()) {
      await this.restartBot(botId);
    }
  }

  /**
   * @param botId Unique Bot ID.
   */
  async startBot (botId: string) {
    const botInfo = this._bots.get(botId);

    assert(botInfo, 'Invalid Bot ID');
    assert(botInfo.stopped, `Bot ${botId} already running`);
    await this._startBot(botId);
  }

  /**
   * @param botId Unique Bot ID.
   * @param topic Party to join.
   * @param invitation Invitation.
   */
  async inviteBot (botId: string, topic: string, invitation: string) {
    const botInfo = this._bots.get(botId);

    assert(botInfo, 'Invalid Bot Id');
    if (botInfo.parties.indexOf(topic) === -1) {
      botInfo.parties.push(topic);
      await this._saveBotsToFile();
    }

    await this._plugin.sendCommand(keyToBuffer(botId), createInvitationMessage(topic, JSON.parse(invitation)));
  }

  async getStatus () {
    return [...this._bots.values()].map(({ started, lastActive, ...rest }) => ({
      ...rest,
      started: started ? started.format() : null,
      lastActive: lastActive ? lastActive.format() : null
    }));
  }

  async stop () {
    for await (const { botId } of this._bots.values()) {
      await this._stopBot(botId);
    }
    await this._leaveControlSwarm?.();
  }

  // TODO(egorgripasov): Merge to _bots.
  botReady (botId: string) {
    return this._connectedBots[botId] || false;
  }

  async sendDirectBotCommand (botId: string, command: any) {
    if (!this._bots.has(botId)) {
      throw new Error(`Bot ${botId} does not exist.`);
    }
    return this._plugin.sendCommand(keyToBuffer(botId), createBotCommand(botId, command));
  }

  async removeSource () {
    await fs.remove(BOT_PACKAGE_DOWNLOAD_DIR);
  }

  /**
   * Start bot instance.
   * @param botId
   * @param options
   */
  private async _startBot (botId: string) {
    const botInfo = this._bots.get(botId);
    assert(botInfo);

    log(`_startBot ${JSON.stringify(botInfo)}`);
    await this._botContainers[botInfo.env].startBot(botInfo);
    botInfo.started = moment.utc();

    await this._saveBotsToFile();

    return botId;
  }

  /**
   * @param {String} botId Unique Bot Id
   * @param {Boolean} stopped Whether bot should be marked as stopped
   */
  private async _stopBot (botId: string, stopped = false) {
    const botInfo = this._bots.get(botId);
    assert(botInfo, 'Invalid Bot Id');

    await this._botContainers[botInfo.env].stopBot(botInfo);

    botInfo.stopped = stopped;
    await this._saveBotsToFile();

    log(`Bot '${botId}' stopped.`);
  }

  private async _saveBotsToFile () {
    const data = [...this._bots.values()];
    await fs.writeJSON(this._botsFile, data);
  }

  private async _readBotsFromFile () {
    assert(this._bots.size === 0, 'Bots already initialized.');

    let data = [];
    try {
      data = await fs.readJson(this._botsFile);
    } catch (err) {
      if (!(err instanceof SyntaxError)) {
        logInfo(err);
      }
    }
    data.forEach(({ botId, ...rest }: any) => {
      this._bots.set(botId, { botId, ...rest });
    });
  }

  /**
   * Handle incoming messages from bot processes.
   */
  private async _botMessageHandler (protocol: any, { message }: any) {
    let result;
    switch (message.__type_url) {
      case COMMAND_SIGN: {
        result = createSignResponse(this._signChallenge(message.message));
        break;
      }

      case MESSAGE_CONFIRM: {
        const { botId } = message;
        this._connectedBots[botId] = true;
        break;
      }

      // Arbitrary event from bot.
      case BOT_EVENT: {
        await this._emitBotEvent(message);
        break;
      }

      default: {
        log('Unknown command:', message);
      }
    }

    return result;
  }

  private async _getBotRecord (botName: string | undefined) {
    if (this._localDev) {
      let name;
      try {
        const botInfo = yaml.load(
          await fs.readFile(path.join(process.cwd(), BOT_CONFIG_FILENAME)) as any // TODO(marik-d): Specify file encoding.
        );
        name = botInfo.name;
      } catch (err) {
        name = chance.animal();
      }
      return { attributes: { name }, id: sha256(name) };
    }
    const { records } = await this._registry.resolveNames([botName]);
    if (!records.length) {
      log(`Bot not found: ${botName}.`);
      throw new Error(`Invalid bot: ${botName}`);
    }
    return records[0];
  }
}
