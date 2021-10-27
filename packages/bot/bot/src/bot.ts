//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';
import { join } from 'path';

import { promiseTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { randomBytes, keyToBuffer, PublicKey } from '@dxos/crypto';
import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { StarTopology, transportProtocolProvider } from '@dxos/network-manager';
import {
  COMMAND_BOT_INVITE,
  BOT_COMMAND,
  BotPlugin,
  createSignCommand,
  createConnectConfirmMessage,
  createBotCommandResponse,
  createEvent,
  Message,
  InvitationMessage
} from '@dxos/protocol-plugin-bot';

import { getClientConfig } from './config';
import { Config } from '@dxos/config';

const CONNECT_TIMEOUT = 30000;
const HEARTBEAT_INTERVAL = 180 * 1000;

const log = debug('dxos:botkit');

export const BOT_STORAGE = '/data';

/**
 * Base class for bots.
 */
export class Bot extends EventEmitter {
  private readonly _parties = new Set();

  private _heartBeat: NodeJS.Timeout | null = null;
  private readonly _uid: string;
  private readonly _persistent: boolean;
  private readonly _restarted: boolean;
  private readonly _cwd: string;
  private readonly _name: string;
  private readonly _controlTopic: Buffer;
  private readonly _controlPeerKey: Buffer;
  private readonly _botFactoryPeerKey: Buffer;

  private readonly _options: any;
  private readonly _config: any;

  private _plugin?: BotPlugin;
  protected _client?: Client;

  private _leaveControlSwarm?: () => void;

  constructor (config: any, options: any = {}) {
    super();

    const { uid, persistent = true, restarted = false, cwd, name, controlTopic } = config.get('bot');

    this._uid = uid;
    this._persistent = persistent;
    this._restarted = restarted;
    this._cwd = cwd;
    this._name = name;

    this._controlTopic = keyToBuffer(controlTopic);
    this._controlPeerKey = keyToBuffer(this._uid);
    this._botFactoryPeerKey = this._controlTopic;

    this._options = options;
    this._config = config;
  }

  get client () {
    return this._client;
  }

  /**
   * Called before `client.initialize()` useful to register custom models.
   */
  protected async _preInit () {}

  /**
   * Start the bot.
   */
  async start () {
    this._plugin = new BotPlugin(this._controlPeerKey, (protocol, message) => this._botMessageHandler(protocol, message));

    log('Starting.');
    this._client = new Client(new Config(this._config.values, {
      system: {
        storage: {
          persistent: this._persistent,
          path: join(this._cwd, BOT_STORAGE)
        },
      }
    }));
    await this._preInit();
    await this._client.initialize();

    if (!this._persistent || !this._client.halo.getProfile()) {
      const { publicKey } = await this._client.halo.createProfile({ username: this._name });
      log(`Identity initialized: ${publicKey}`);
    }

    // Join control swarm.
    log('Joining control topic.');
    await this._connectToControlTopic();

    const parties = this._client.echo.queryParties();
    this._onJoin(parties.value);

    parties.subscribe(() => {
      this._onJoin(parties.value);
    });

    await this._startHeartbeat();

    await this._plugin.sendCommand(this._botFactoryPeerKey, createConnectConfirmMessage(this._uid));
  }

  async stop () {
    if (this._heartBeat !== null) {
      clearTimeout(this._heartBeat);
    }
    await this._leaveControlSwarm?.();
    await this.client?.destroy();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async botCommandHandler (command: any): Promise<any | void> {

  }

  async emitBotEvent (type: any, data: any) {
    await this._plugin!.sendCommand(this._botFactoryPeerKey, createEvent(this._uid, type, data));
  }

  /**
   * Handle incoming messages from bot factory process.
   * @param {Protocol} protocol
   * @param {{ message }} command.
   */
  private async _botMessageHandler (protocol: any, { message }: Message) {
    assert(message);
    let result;
    switch (message.__type_url) {
      case COMMAND_BOT_INVITE: {
        const { invitation } = message;
        await this._joinParty(invitation);
        break;
      }

      case BOT_COMMAND: {
        const { command } = message;
        assert(command);
        try {
          // TODO(marik-d): Support custom codecs.
          const decodedCommand = JSON.parse(command.toString()) || {};
          const result = await this.botCommandHandler(decodedCommand);
          const data = Buffer.from(JSON.stringify(result || {}));
          return createBotCommandResponse(data);
        } catch (error) {
          return createBotCommandResponse(undefined, error.message);
        }
      }

      default: {
        log('Unknown command:', message);
      }
    }

    return result;
  }

  private async _joinParty (invitation: InvitationMessage.Invitation | undefined) {
    if (invitation) {
      const secretProvider = async () => {
        log('secretProvider begin.');
        const message = randomBytes(32);
        const response = await this._plugin!.sendCommand(this._botFactoryPeerKey, createSignCommand(message));
        const signature = (response as any).message.signature;
        assert(signature);
        const secret = Buffer.alloc(signature.length + message.length);
        signature.copy(secret);
        message.copy(secret, signature.length);
        log('secretProvider end.');
        return secret;
      };

      log(`Joining party with invitation: ${JSON.stringify(invitation)}`);

      assert(invitation.hash);
      const party = await this._client!.echo.joinParty(InvitationDescriptor.fromQueryParameters(invitation as any), secretProvider);
      await party.open();
    }
  }

  private _onJoin (parties: Party[] = []) {
    parties.forEach(party => {
      const topic = party.key.toString();
      if (!this._parties.has(topic)) {
        this._parties.add(topic);
        this.emit('party', party.key);
      }
    });
  }

  private async _connectToControlTopic () {
    const promise = new Promise<void>(resolve => {
      // TODO(egorgripasov): Factor out.
      this._plugin!.on('peer:joined', (peerId: Buffer) => {
        if (peerId.equals(this._botFactoryPeerKey)) {
          log('Bot factory peer connected');
          resolve();
        }
      });
    });

    this._leaveControlSwarm = await this._client!.echo.networkManager.joinProtocolSwarm({
      topic: PublicKey.from(this._controlTopic),
      protocol: transportProtocolProvider(this._controlTopic, this._controlPeerKey, this._plugin),
      peerId: PublicKey.from(this._controlPeerKey),
      topology: new StarTopology(PublicKey.from(this._botFactoryPeerKey))
    });

    await promiseTimeout(promise, CONNECT_TIMEOUT, new Error(`Bot failed to connect to control topic: Timed out in ${CONNECT_TIMEOUT} ms.`));
  }

  private async _startHeartbeat () {
    if (this._heartBeat !== null) {
      return;
    }
    this._heartBeat = setInterval(() => {
      const used: any = process.memoryUsage();
      for (const key in used) {
        log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
      }
    }, HEARTBEAT_INTERVAL);
  }
}
