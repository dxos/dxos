//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { sync as readPackageJson } from 'read-pkg-up';

import { waitForCondition } from '@dxos/async';
import { Client } from '@dxos/client';
import { keyToBuffer, keyToString, PublicKey, sign } from '@dxos/crypto';
import { StarTopology, transportProtocolProvider } from '@dxos/network-manager';
import {
  COMMAND_SPAWN,
  COMMAND_SPAWN_AND_INVITE,
  COMMAND_STATUS,
  COMMAND_INVITE,
  COMMAND_MANAGE,
  COMMAND_RESET,
  COMMAND_STOP,
  BOT_COMMAND,
  BotPlugin,
  createStatusResponse,
  createSpawnResponse,
  createCommandResponse,
  createBotCommandResponse,
  createEvent,
  Message,
  Invite,
  SpawnOptions
} from '@dxos/protocol-plugin-bot';

import { BotManager } from './bot-manager';
import { getClientConfig } from './config';
import { BotContainer } from './containers/common';
import { LocalDevBotContainer } from './containers/local-dev-container';
import { NATIVE_ENV, NODE_ENV, getPlatformInfo } from './env';
import { log } from './log';

const botkitPackage = readPackageJson({ cwd: __dirname }) as any;

const BOT_SPAWN_TIMEOUT = 50000;
const BOT_SPAWN_CHECK_INTERVAL = 500;

/**
 * Accepts bot control commands. Creates and manages bots using BotContainer.
 */
export class BotFactory {
  private readonly _config: any;

  /**
   * Used for communication between bot-factory and clients.
   */
  private readonly _topic: Buffer;
  private readonly _peerKey: Buffer;
  private readonly _plugin: any;
  private readonly _localDev: boolean;
  private readonly _botContainers: Record<string, BotContainer>;
  private readonly _platorm: string;
  private readonly _version: string;
  private _client?: Client;
  private _botManager?: BotManager;
  private _leaveSwarm?: () => void;

  constructor (config: any, botContainers: Record<string, BotContainer>) {
    assert(config);

    log(`Started BotFactory with ${Object.keys(botContainers)} containers.`);

    this._config = config;
    this._topic = keyToBuffer(this._config.get('bot.topic'));
    // For simplicity of communication with BotFactory assume its PeerId is the same as topic.
    this._peerKey = this._topic;
    this._plugin = new BotPlugin(this._peerKey, (protocol, message) => this.handleMessage(protocol, message));
    this._localDev = this._config.get('bot.localDev');

    this._botContainers = this._localDev
      ? {
        [NODE_ENV]: new LocalDevBotContainer(config.get('cli.nodePath')),
        [NATIVE_ENV]: new LocalDevBotContainer(config.get('cli.nodePath'))
      }
      : botContainers;

    const { platform, arch } = getPlatformInfo();
    this._platorm = `${platform}.${arch}`;

    this._version = botkitPackage?.packageJson?.version;

    process.on('SIGINT', async (...args) => {
      log('Signal received.', ...args);
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Start factory.
   */
  async start () {
    this._client = new Client({
      swarm: getClientConfig(this._config).swarm
    });
    await this._client.initialize();

    this._botManager = new BotManager(this._config, this._botContainers, this._client, {
      signChallenge: this.signChallenge.bind(this),
      emitBotEvent: this.emitBotEvent.bind(this)
    });

    for (const container of Object.values(this._botContainers)) {
      await container.start({ controlTopic: this._botManager.controlTopic });
    }
    await this._botManager.start();

    this._leaveSwarm = await this._client.networkManager.joinProtocolSwarm({
      topic: PublicKey.from(this._topic),
      protocol: transportProtocolProvider(this._topic, this._peerKey, this._plugin),
      peerId: PublicKey.from(this._peerKey),
      topology: new StarTopology(PublicKey.from(this._peerKey))
    });

    log(JSON.stringify(
      {
        started: true,
        topic: keyToString(this._topic),
        peerId: keyToString(this._peerKey),
        localDev: this._localDev,
        controlTopic: keyToString(this._botManager.controlTopic)
      }
    ));
  }

  /**
   * Handle incoming message.
   */
  async handleMessage (protocol: any, { message }: Message) {
    log(`Received command: ${JSON.stringify(message)}`);
    assert(message);

    let runCommand;

    switch (message.__type_url) {
      case COMMAND_SPAWN: {
        try {
          const { botName, options } = message;
          const botId = await this.spawnBot(botName, options);
          return createSpawnResponse(botId);
        } catch (err) {
          log(err);
          return createSpawnResponse(undefined, err.message);
        }
      }

      case COMMAND_INVITE: {
        const { botId } = message;
        assert(botId);
        runCommand = async () => this.inviteBot(botId, message);
        break;
      }

      case COMMAND_SPAWN_AND_INVITE: {
        try {
          const { botName, topic, invitation, options } = message;
          const botId = await this.spawnBot(botName, options);
          await this.inviteBot(botId, { topic, invitation });
          return createSpawnResponse(botId);
        } catch (err) {
          log(err);
          return createSpawnResponse(undefined, err.message);
        }
      }

      case COMMAND_MANAGE: {
        const { botId, command } = message;
        assert(botId);
        runCommand = async () => {
          switch (command) {
            case 'start': return this._botManager!.startBot(botId);
            case 'stop': return this._botManager!.stopBot(botId);
            case 'restart': return this._botManager!.restartBot(botId);
            case 'kill': return this._botManager!.killBot(botId);
            default: break;
          }
        };
        break;
      }

      case COMMAND_RESET: {
        const { source } = message;
        runCommand = async () => {
          await this._botManager!.killAllBots();
          if (source) {
            await this._botManager!.removeSource();
          }
        };
        break;
      }

      case COMMAND_STOP: {
        const { errorCode = 0 } = message;
        process.exit(Number(errorCode));
      }

      case COMMAND_STATUS: {
        return createStatusResponse(
          this._version,
          this._platorm,
          Math.floor(process.uptime()).toString(),
          await this._botManager!.getStatus()
        );
      }

      case BOT_COMMAND: {
        const { botId, command } = message;
        assert(botId);
        try {
          const result = await this._botManager!.sendDirectBotCommand(botId, command);
          const { message: { data, error } } = result;
          return createBotCommandResponse(data, error);
        } catch (err) {
          return createBotCommandResponse(undefined, err.message);
        }
      }

      default: {
        log('Unknown command:', JSON.stringify(message));
      }
    }

    if (runCommand) {
      let status = 'success';
      let error: any = {};
      try {
        await runCommand();
      } catch (err) {
        status = 'failed';
        error = err;
      }
      return createCommandResponse(status, error.message);
    }
  }

  async spawnBot (botName: string | undefined, options?: SpawnOptions) {
    const botId = await this._botManager!.spawnBot(botName, options);
    // TODO(egorgripasov): Move down.
    await waitForCondition(() => this._botManager!.botReady(botId), BOT_SPAWN_TIMEOUT, BOT_SPAWN_CHECK_INTERVAL);
    return botId;
  }

  /**
   * Invite bot to a party.
   */
  async inviteBot (botId: string, botConfig: Invite) {
    assert(botId);
    assert(botConfig);

    const { topic, invitation } = botConfig;

    assert(topic);
    log(`Invite bot request for '${botId}': ${JSON.stringify(botConfig)}`);

    assert(invitation);
    await this._botManager!.inviteBot(botId, topic, invitation);
  }

  async stop () {
    await this._leaveSwarm?.();
    await this._botManager!.stop();
    for (const container of Object.values(this._botContainers)) {
      await container.stop();
    }
    // TODO(marik-d): Network-manager clean-up.
    // await this._client!.networkManager.close();
  }

  signChallenge (challenge: Buffer) {
    return sign(challenge, keyToBuffer(this._config.get('bot.secretKey')));
  }

  async emitBotEvent (message: any) {
    const { botId, type, data } = message;
    await this._plugin.broadcastCommand(createEvent(botId, type, data));
  }
}
