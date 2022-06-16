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
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { MMSTTopology, NetworkManager, Plugin } from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { Replicator } from '@dxos/protocol-plugin-replicator';

import { IdentityProvider } from '../halo';
import { HaloRecoveryInitiator, InvitationManager, OfflineInvitationClaimer } from '../invitations';
import { CredentialsProvider } from '../parties/authenticator';
import { PartyFeedProvider } from './party-feed-provider';

const log = debug('dxos:echo-db:party-protocol-factory');

/**
 * Manages the party's connection to the network swarm.
 */
export class PartyProtocolFactory {
  private readonly _presencePlugin = new PresencePlugin(this._peerId.asBuffer());
  private readonly _replicatorProtocolPluginFactory: ReplicatorProtocolPluginFactory;

  private _started = false;

  constructor (
    private readonly _partyKey: PartyKey,
    private readonly _networkManager: NetworkManager,
    private readonly _feedProvider: PartyFeedProvider,
    private readonly _peerId: PublicKey,
    private readonly _credentials: CredentialsProvider,
    activeFeeds: FeedSetProvider
  ) {
    // Replication.
    this._replicatorProtocolPluginFactory =
      new ReplicatorProtocolPluginFactory(this._feedProvider, activeFeeds);
  }

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

    log(`Joining swarm: ${this._partyKey.toHex()}`);
    return this._networkManager.joinProtocolSwarm({
      protocol: ({ channel, initiator }) => this._createProtocol(channel, { initiator }, plugins),
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

  private _createProtocol (channel: any, opts: {initiator: boolean}, extraPlugins: Plugin[]) {
    const plugins: Plugin[] = [
      ...this._replicatorProtocolPluginFactory.createPlugins(),
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
        peerId: keyToString(this._peerId.asBuffer()),
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
class ReplicatorProtocolPluginFactory {
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
 * Creates authenticator network-protocol plugin that guards access to the replicator.
 */
export function createAuthPlugin(authenticator: Authenticator, peerId: PublicKey) {
  return new AuthPlugin(peerId.asBuffer(), authenticator, [Replicator.extension]);
}

/**
 * Creates network protocol plugin that allows peers to recover access to their HALO.
 * Plugin is intended to be used in HALO party swarm.
 * 
 */
export function createHaloRecoveryPlugin(identityProvider: IdentityProvider, peerId: PublicKey) {
  return new GreetingCommandPlugin(
    peerId.asBuffer(),
    HaloRecoveryInitiator.createHaloInvitationClaimHandler(identityProvider)
  )
}

/**
 * Creates network protocol plugin that allows peers to claim offline invitations.
 * Plugin is intended to be used in data-party swarms.
 */
export function createOfflineInvitationPlugin(invitationManager: InvitationManager, peerId: PublicKey) {
  return new GreetingCommandPlugin(
    peerId.asBuffer(),
    OfflineInvitationClaimer.createOfflineInvitationClaimHandler(invitationManager)
  )
}
