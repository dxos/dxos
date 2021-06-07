//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import hypercore from 'hypercore';

import { synchronized } from '@dxos/async';
import {
  AuthPlugin,
  Authenticator,
  GreetingCommandPlugin
} from '@dxos/credentials';
import { discoveryKey, keyToString, PublicKey } from '@dxos/crypto';
import { FeedKey, FeedSetProvider, PartyKey } from '@dxos/echo-protocol';
import { MMSTTopology, NetworkManager } from '@dxos/network-manager';
import { Protocol } from '@dxos/protocol';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { Replicator } from '@dxos/protocol-plugin-replicator';

import { IdentityManager } from '../halo';
import { HaloRecoveryInitiator, InvitationManager, OfflineInvitationClaimer } from '../invitations';
import { FeedStoreAdapter } from '../util';
import { PartyInternal } from './party-internal';

const log = debug('dxos:echo:replication-adapter');

export interface CredentialsProvider {
  /**
   * The credentials (eg, a serialized AuthMessage) as a bytes.
   */
  get(): Buffer
}

export interface PartyProvider {
  get(): PartyInternal
}

// TODO(burdon): Exercise in refactoring (i.e., "dependency inversion").
// TODO(burdon): Consistently use crypto utils for asBuffer, toString('base64'), toHex, etc?

/**
 * Manages the party's connection to the network swarm.
 */
export class PartyProtocol {
  private readonly _peerId = PublicKey.random(); // TODO(marik-d): Should this be a specific peer id?

  // TODO(rzadp): Enable and fix the cleanup bug.
  // private readonly _presence = new PresencePlugin(this._peerId.asBuffer());

  private readonly _haloProtocolPluginFactory: HaloProtocolPluginFactory;
  private readonly _replicatorProtocolPluginFactory: ReplicatorProtocolPluginFactory;

  private _started = false;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _networkManager: NetworkManager,
    feedStore: FeedStoreAdapter,
    activeFeeds: FeedSetProvider,
    invitationManager: InvitationManager,
    private readonly _identityManager: IdentityManager,
    private readonly _credentials: CredentialsProvider,
    authenticator: Authenticator
  ) {
    // TODO(burdon): Does it make sense to pass in factories rather than creating them here?
    //   ONLY if the system can function without one of them!
    this._haloProtocolPluginFactory =
      new HaloProtocolPluginFactory(this._partyKey, this._identityManager, invitationManager, authenticator);
    this._replicatorProtocolPluginFactory =
      new ReplicatorProtocolPluginFactory(this._partyKey, feedStore, activeFeeds);
  }

  async start () {
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

    log('Starting...', this._partyKey.toHex());
    return this._networkManager.joinProtocolSwarm({
      protocol: ({ channel }: any) => this._createProtocol(channel),
      peerId: this._peerId,
      topic: this._partyKey,
      // presence: this._presence,
      topology: new MMSTTopology(topologyConfig),
      label: `Protocol swarm: ${this._partyKey}`
    });
  }

  async stop () {
    if (!this._started) {
      return;
    }
    this._started = false;

    log('Stopping...', this._partyKey.toHex());
    await this._networkManager.leaveProtocolSwarm(this._partyKey);
  }

  private _createProtocol (channel: any) {
    assert(this._identityManager.deviceKey);

    const plugins = [
      ...this._haloProtocolPluginFactory.createPlugins(),
      ...this._replicatorProtocolPluginFactory.createPlugins(),
      // this._presence
    ];

    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryToPublicKey: (dk: any) => {
        if (!discoveryKey(this._partyKey.asBuffer()).equals(dk)) {
          return undefined;
        }

        // TODO(marik-d): Why does this do side effects?
        // TODO(burdon): Remove need for external closure (i.e., pass object to this callback).
        protocol.setContext({ topic: this._partyKey.toHex() });

        // TODO(burdon): Inconsistent use of toHex and asBuffer.
        //   Need to progressively clean-up all uses of Keys via Typscript.
        return this._partyKey.asBuffer();
      }
    });

    protocol
      .setSession({
        // TODO(burdon): See deprecated `protocolFactory` in HALO.
        peerId: this._identityManager.deviceKey.publicKey.asBuffer(),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: this._credentials.get().toString('base64')
      })
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init(channel);

    return protocol;
  }
}

/**
 * Creates the protocol plugin for feed replication.
 */
class ReplicatorProtocolPluginFactory {
  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _activeFeeds: FeedSetProvider
  ) {}

  createPlugins () {
    return [
      new Replicator({
        load: async () => {
          const partyFeeds = await Promise.all(this._activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
          log(`Loading feeds: ${partyFeeds.map(feed => keyToString(feed.key))}`);
          return partyFeeds.map((feed) => {
            return { discoveryKey: feed.discoveryKey };
          });
        },

        subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this._activeFeeds.added.on(async (feedKey) => {
          log(`Adding feed: ${feedKey.toHex()}`);
          const feed = await this._openFeed(feedKey);
          addFeedToReplicatedSet({ discoveryKey: feed.discoveryKey });
        }),

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        replicate: async (remoteFeeds: any, info: any) => {
          // We can ignore remoteFeeds entirely, since the set of feeds we want to replicate is dictated by the Party.
          // TODO(telackey): why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
          log(`Replicating: peerId=${info.session.peerId.toString('hex')}; feeds=${this._activeFeeds.get().map(key => key.toHex())}`);
          return Promise.all(this._activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
        }
      })
    ];
  }

  @synchronized
  private async _openFeed (key: FeedKey): Promise<hypercore.Feed> {
    return this._feedStore.getFeed(key) ?? await this._feedStore.createReadOnlyFeed(key, this._partyKey);
  }
}

/**
 * Creates protocol plugins for HALO authentication and invitations.
 */
class HaloProtocolPluginFactory {
  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _identityManager: IdentityManager,
    private readonly _invitationManager: InvitationManager,
    private readonly _authenticator: Authenticator
  ) {}

  createPlugins () {
    assert(this._identityManager.identityKey);
    assert(this._identityManager.deviceKey);

    const plugins: any[] = [
      new AuthPlugin(
        this._identityManager.deviceKey.publicKey.asBuffer(),
        this._authenticator,
        [Replicator.extension]
      )
    ];

    // Determine if this party is the main HALO.
    const isHalo = this._identityManager.identityKey.publicKey.equals(this._partyKey);
    if (isHalo) {
      // Enables devices to re-join the HALO using a recovery seed phrase.
      plugins.push(
        new GreetingCommandPlugin(
          this._identityManager.deviceKey.publicKey.asBuffer(),
          HaloRecoveryInitiator.createHaloInvitationClaimHandler(this._identityManager)
        )
      );
    } else {
      // Enables peers to join the party.
      plugins.push(
        new GreetingCommandPlugin(
          this._identityManager.deviceKey.publicKey.asBuffer(),
          OfflineInvitationClaimer.createOfflineInvitationClaimHandler(this._invitationManager)
        )
      );
    }

    return plugins;
  }
}
