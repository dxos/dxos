//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { AuthPlugin, Authenticator, GreetingCommandPlugin } from '@dxos/credentials';
import { discoveryKey, keyToString, PublicKey } from '@dxos/crypto';
import { FeedKey, FeedSetProvider, PartyKey } from '@dxos/echo-protocol';
import type { HypercoreFeed } from '@dxos/feed-store';
import { Protocol } from '@dxos/mesh-protocol';
import { MMSTTopology, NetworkManager } from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { Replicator } from '@dxos/protocol-plugin-replicator';

import { IdentityProvider } from '../halo';
import { HaloRecoveryInitiator, InvitationManager, OfflineInvitationClaimer } from '../invitations';
import { PartyFeedProvider } from './party-feed-provider';

const log = debug('dxos:echo-db:party-protocol-factory');

export interface CredentialsProvider {
  /**
   * The credentials (e.g., a serialized AuthMessage) as a bytes.
   */
  get (): Buffer
}

/**
 * Manages the party's connection to the network swarm.
 */
export class PartyProtocolFactory {
  private readonly _peerId = PublicKey.random(); // TODO(marik-d): Should this be a specific peer id?

  private readonly _presencePlugin = new PresencePlugin(this._peerId.asBuffer());
  private readonly _haloProtocolPluginFactory: HaloProtocolPluginFactory;
  private readonly _replicatorProtocolPluginFactory: ReplicatorProtocolPluginFactory;

  private _started = false;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _networkManager: NetworkManager,
    private readonly _feedProvider: PartyFeedProvider,
    private readonly _identityProvider: IdentityProvider,
    private readonly _credentials: CredentialsProvider,
    invitationManager: InvitationManager,
    authenticator: Authenticator,
    activeFeeds: FeedSetProvider
  ) {
    // Authentication.
    this._haloProtocolPluginFactory =
      new HaloProtocolPluginFactory(this._partyKey, this._identityProvider, invitationManager, authenticator);

    // Replication.
    this._replicatorProtocolPluginFactory =
      new ReplicatorProtocolPluginFactory(this._feedProvider, activeFeeds);
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

    log(`Joining swarm: ${this._partyKey.toHex()}`);
    return this._networkManager.joinProtocolSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol(channel, { initiator }),
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

  private _createProtocol (channel: any, opts: {initiator: boolean}) {
    assert(this._identityProvider().deviceKey);

    const plugins = [
      ...this._haloProtocolPluginFactory.createPlugins(),
      ...this._replicatorProtocolPluginFactory.createPlugins(),
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
        peerId: keyToString(this._identityProvider().deviceKey!.publicKey.asBuffer()),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: this._credentials.get().toString('base64')
      },

      initiator: opts.initiator
    });

    protocol
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init();

    return protocol;
  }
}

/**
 * Creates the protocol plugin for feed replication.
 */
export class ReplicatorProtocolPluginFactory {
  constructor (
    private readonly _feedProvider: PartyFeedProvider,
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

        subscribe: (addFeedToReplicatedSet: (feed: any) => void) => {
          return this._activeFeeds.added.on(async (feedKey) => {
            log(`Adding feed: ${feedKey.toHex()}`);
            const feed = await this._openFeed(feedKey);
            addFeedToReplicatedSet({ discoveryKey: feed.discoveryKey });
          });
        },

        replicate: async (remoteFeeds, info) => {
          // We can ignore remoteFeeds entirely, since the set of feeds we want to replicate is dictated by the Party.
          // TODO(telackey): Why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
          log(`Replicating: peerId=${info.session}; feeds=${this._activeFeeds.get().map(key => key.toHex())}`);
          return Promise.all(this._activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
        }
      })
    ];
  }

  @synchronized
  private async _openFeed (key: FeedKey): Promise<HypercoreFeed> {
    const descriptor = await this._feedProvider.createOrOpenReadOnlyFeed(key);
    return descriptor.feed;
  }
}

/**
 * Creates protocol plugins for HALO authentication and invitations.
 */
class HaloProtocolPluginFactory {
  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _identityProvider: IdentityProvider,
    private readonly _invitationManager: InvitationManager,
    private readonly _authenticator: Authenticator
  ) {}

  private get _identity () {
    return this._identityProvider();
  }

  createPlugins () {
    assert(this._identity.identityKey);
    assert(this._identity.deviceKey);

    const plugins: any[] = [
      new AuthPlugin(
        this._identity.deviceKey.publicKey.asBuffer(),
        this._authenticator,
        [Replicator.extension]
      )
    ];

    // Determine if this party is the main HALO.
    const isHalo = this._identity.identityKey.publicKey.equals(this._partyKey);
    if (isHalo) {
      // Enables devices to re-join the HALO using a recovery seed phrase.
      plugins.push(
        new GreetingCommandPlugin(
          this._identity.deviceKey.publicKey.asBuffer(),
          HaloRecoveryInitiator.createHaloInvitationClaimHandler(this._identityProvider)
        )
      );
    } else {
      // Enables peers to join the party.
      plugins.push(
        new GreetingCommandPlugin(
          this._identity.deviceKey.publicKey.asBuffer(),
          OfflineInvitationClaimer.createOfflineInvitationClaimHandler(this._invitationManager)
        )
      );
    }

    return plugins;
  }
}
