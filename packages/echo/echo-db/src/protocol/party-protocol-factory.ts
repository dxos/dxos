//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { discoveryKey } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';
import { Protocol } from '@dxos/mesh-protocol';
import { MMSTTopology, NetworkManager, Plugin } from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { PublicKey } from '@dxos/protocols';

import { CredentialsProvider } from './authenticator';

const log = debug('dxos:echo-db:party-protocol-factory');

/**
 * Manages the party's connection to the network swarm.
 */
export class PartyProtocolFactory {
  private readonly _presencePlugin = new PresencePlugin(this._peerId.asBuffer());

  private _started = false;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _networkManager: NetworkManager,
    private readonly _peerId: PublicKey,
    private readonly _credentials: CredentialsProvider
  ) {}

  async start (plugins: Plugin[]) {
    if (this._started) {
      return;
    }
    this._started = true;

    // TODO(burdon): Move to config (with sensible defaults).
    const topologyConfig = {
      originateConnections: 4,
      maxPeers: 10,
      sampleSize: 20
    };

    const credentials = await this._credentials.get();
    
    log(`Joining swarm: ${this._partyKey.toHex()}`);
    return this._networkManager.joinProtocolSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol(credentials, channel, { initiator }, plugins),
      peerId: this._peerId,
      topic: this._partyKey,
      presence: this._presencePlugin,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._partyKey}`
    });
  }

  async stop () {
    if (!this._started) {
      return;
    }
    this._started = false;

    log(`Leaving swarm: ${this._partyKey.toHex()}`);
    await this._networkManager.leaveProtocolSwarm(this._partyKey);
  }

  private _createProtocol (credentials: Buffer, channel: any, opts: { initiator: boolean }, extraPlugins: Plugin[]) {
    const plugins: Plugin[] = [
      ...extraPlugins,
      this._presencePlugin
    ];

    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryKey: channel,

      discoveryToPublicKey: (dk: any) => {
        if (!discoveryKey(this._partyKey.asBuffer()).equals(dk)) {
          return undefined;
        }

        // TODO(marik-d): Why does this do side effects?
        // TODO(burdon): Remove need for external closure (ie, pass object to this callback).
        protocol.setContext({ topic: this._partyKey.toHex() });

        // TODO(burdon): IMPORTANT: inconsistent use of toHex and asBuffer.
        //  - Need to progressively clean-up all uses of Keys via Typescript.
        return this._partyKey.asBuffer();
      },

      userSession: {
        // TODO(burdon): See deprecated `protocolFactory` in HALO.
        peerId: this._peerId.toHex(),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: credentials.toString('base64')
      },

      initiator: opts.initiator
    });

    protocol
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init();

    return protocol;
  }
}
