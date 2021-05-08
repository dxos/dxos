//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';
import { keyPair } from 'hypercore-crypto';

import { keyToBuffer, PublicKey } from '@dxos/crypto';
import { logs } from '@dxos/debug';
import { NetworkManager, StarTopology, transportProtocolProvider } from '@dxos/network-manager';
import {
  BotPlugin,
  createSpawnCommand,
  createSpawnAndInviteCommand,
  createStatusCommand,
  createInvitationCommand,
  createBotManagementCommand,
  createResetCommand,
  createStopCommand,
  createBotCommand,
  SpawnOptions,
  BotCommandResponse
} from '@dxos/protocol-plugin-bot';
import { waitForCondition } from '@dxos/util';

const { log } = logs('dxos:botkit-client');

const CONNECT_TIMEOUT = 30000;
const WAIT_FOR_CONNECT_TIMEOUT = 10000;
const CONNECTION_CHECK_INTERVAL = 100;

enum SwarmingStatus {
  NotConnected,
  Connecting,
  Connected
}

/**
 * BotFactory Client.
 */
export class BotFactoryClient extends EventEmitter {
  _botFactoryTopic: Buffer;
  _botFactoryPeerId: Buffer;
  _networkManager: NetworkManager;
  _peerId: Buffer;
  _botPlugin: BotPlugin;
  _connected: Boolean;
  _swarm: SwarmingStatus;

  constructor (networkManager: NetworkManager, botFactoryTopic: string) {
    super();

    assert(botFactoryTopic);
    assert(networkManager);

    this._botFactoryTopic = keyToBuffer(botFactoryTopic);
    // BotFactory PeerId is the same as Topic.
    this._botFactoryPeerId = keyToBuffer(botFactoryTopic);
    this._networkManager = networkManager;

    this._peerId = keyPair().publicKey;
    this._botPlugin = new BotPlugin(this._peerId, () => {});

    this._connected = false;
    this._swarm = SwarmingStatus.NotConnected;
  }

  /**
   * Send request for bot spawning.
   */
  async sendSpawnRequest (botName: string | undefined, options?: SpawnOptions) {
    if (!this._connected) {
      await this.connect();
    }

    log(`Sending spawn request for bot ${botName}`);
    const spawnResponse = await this._botPlugin.sendCommand(this._botFactoryTopic, createSpawnCommand(botName, options));

    assert(spawnResponse, `Unable to spawn bot ${botName}`);
    // eslint-disable-next-line camelcase
    assert(spawnResponse.message?.__type_url === 'dxos.protocol.bot.SpawnResponse', 'Invalid response type');

    const { message: { botId } } = spawnResponse;

    return botId;
  }

  /**
   * Send request for bot spawning with invitation.
   */
  async sendSpawnAndInviteRequest (botName: string | undefined, partyToJoin: string, invitation: Object, options: SpawnOptions) {
    if (!this._connected) {
      await this.connect();
    }

    log(`Sending spawn request and invitation for bot ${botName || ''}`);
    const spawnResponse = await this._botPlugin.sendCommand(this._botFactoryTopic, createSpawnAndInviteCommand(botName, keyToBuffer(partyToJoin), JSON.stringify(invitation), options));

    assert(spawnResponse, `Unable to spawn or invite bot ${botName}`);
    // eslint-disable-next-line camelcase
    assert(spawnResponse.message?.__type_url === 'dxos.protocol.bot.SpawnResponse', 'Invalid response type');

    const { message: { botId } } = spawnResponse;

    return botId;
  }

  async sendBotManagementRequest (botId: string, command: string) {
    if (!this._connected) {
      await this.connect();
    }

    assert(botId, 'Invalid Bot Id');
    assert(command, 'Invalid command');

    const response =
      await this._botPlugin.sendCommand(this._botFactoryTopic, createBotManagementCommand(botId, command));
    // eslint-disable-next-line camelcase
    assert(response?.message?.__type_url === 'dxos.protocol.bot.CommandResponse', 'Invalid response type');
    const { message: { error } } = response;

    if (error) {
      throw new Error(error);
    }
  }

  /**
   * Send request for bot invitation.
   */
  async sendInvitationRequest (botId: string, partyToJoin: string, spec: Object, invitation: Object) {
    if (!this._connected) {
      await this.connect();
    }

    log(`Sending spawn request for party: ${partyToJoin} with invitation id: ${invitation}`);
    const invitationResponse = await this._botPlugin.sendCommand(this._botFactoryTopic,
      createInvitationCommand(botId, keyToBuffer(partyToJoin), JSON.stringify(spec), JSON.stringify(invitation)));
    // eslint-disable-next-line camelcase
    assert(invitationResponse?.message?.__type_url === 'dxos.protocol.bot.CommandResponse', 'Invalid response type');
    const { message: { error } } = invitationResponse;

    if (error) {
      throw new Error(error);
    }
  }

  async sendResetRequest (source = false) {
    if (!this._connected) {
      await this.connect();
    }

    log('Sending reset request.');
    const response = await this._botPlugin.sendCommand(this._botFactoryTopic, createResetCommand(source));
    // eslint-disable-next-line camelcase
    assert(response?.message?.__type_url === 'dxos.protocol.bot.CommandResponse', 'Invalid response type');
    const { message: { error } } = response;

    if (error) {
      throw new Error(error);
    }
  }

  async sendStopRequest (code = 0) {
    if (!this._connected) {
      await this.connect();
    }

    log('Sending stop request.');
    await this._botPlugin.sendCommand(this._botFactoryTopic, createStopCommand(code.toString()), true);
  }

  async getStatus () {
    try {
      if (!this._connected) {
        await this.connect();
      }

      const status = await this._botPlugin.sendCommand(this._botFactoryTopic, createStatusCommand());
      // TODO(egorgripasov): Use dxos/codec function.
      assert(status?.message);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message: { __type_url, ...data } } = status; // eslint-disable-line camelcase
      return { started: true, ...data };
    } catch (err) {
      log(err);
      return { started: false };
    }
  }

  async sendBotCommand (botId: string, command: Buffer): Promise<{ message: BotCommandResponse; }> {
    if (!this._connected) {
      await this.connect();
    }

    const response = await this._botPlugin.sendCommand(this._botFactoryTopic, createBotCommand(botId, command));
    // eslint-disable-next-line camelcase
    assert(response?.message?.__type_url === 'dxos.protocol.bot.BotCommandResponse');
    return { message: response.message };
  }

  /**
   * Close network resources.
   */
  async close () {
    log('Leaving swarm with BotFactory.');
    this.emit('close');
    if (this._swarm === SwarmingStatus.Connecting) {
      try {
        await waitForCondition(() => this._swarm === SwarmingStatus.Connected, WAIT_FOR_CONNECT_TIMEOUT, CONNECTION_CHECK_INTERVAL);
      } catch (err) {
        log(`Connection was not established: ${err}`);
      }
    }
    if (this._swarm === SwarmingStatus.Connected) {
      await this._networkManager.leaveProtocolSwarm(PublicKey.from(this._botFactoryTopic));
      this._swarm = SwarmingStatus.NotConnected;
    }
  }

  /**
   * Connect to BotFactory.
   */
  async connect () {
    log('Joining swarm with BotFactory.');
    this._swarm = SwarmingStatus.Connecting;

    return await timeout(async () => {
      const promise = new Promise(resolve => {
        // TODO(egorgripasov): Factor out.
        this._botPlugin.on('peer:joined', (peerId: Buffer) => {
          if (peerId.equals(this._botFactoryPeerId)) {
            log('Bot factory peer connected');
            this._connected = true;
            resolve(true);
          }
        });
        this.on('close', () => {
          resolve(false);
        });
      });

      await this._networkManager.joinProtocolSwarm({
        topic: PublicKey.from(this._botFactoryTopic),
        protocol: transportProtocolProvider(this._botFactoryTopic, this._peerId, this._botPlugin),
        peerId: PublicKey.from(this._peerId),
        topology: new StarTopology(PublicKey.from(this._botFactoryPeerId))
      });
      this._swarm = SwarmingStatus.Connected;

      return await promise;
    }, CONNECT_TIMEOUT, () => new Error(`Failed to connect to bot factory: Timed out in ${CONNECT_TIMEOUT}ms.`));
  }
}

// TODO(marik-d): Move to async (replace existing implemetation).
function timeout<T> (action: () => Promise<T>, timeout: number, getError?: () => Error) {
  function throwOnTimeout (timeout: number, getError: () => Error) {
    // eslint-disable-next-line promise/param-names
    return new Promise((_, reject) => setTimeout(() => reject(getError()), timeout));
  }

  return Promise.race([
    action(),
    throwOnTimeout(timeout, getError ?? (() => new Error(`Timed out in ${timeout}ms.`)))
  ]);
}
