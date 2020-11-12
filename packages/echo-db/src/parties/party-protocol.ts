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
import { discoveryKey, keyToString } from '@dxos/crypto';
import { FeedKey, FeedSetProvider, PartyKey } from '@dxos/echo-protocol';
import { NetworkManager } from '@dxos/network-manager';
import { Protocol } from '@dxos/protocol';
import { Replicator } from '@dxos/protocol-plugin-replicator';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { HaloRecoveryInitiator } from '../invitations/halo-recovery-initiator';
import { InvitationManager } from '../invitations/invitation-manager';
import { OfflineInvitationClaimer } from '../invitations/offline-invitation-claimer';
import { IdentityManager } from './identity-manager';
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

/**
 * Joins a network swarm with replication protocol and offline invitation/halo recovery protocol.
 */
export class PartyProtocol {
  private _started = false;

  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _networkManager: NetworkManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _partyKey: PartyKey,
    private readonly _activeFeeds: FeedSetProvider,
    private readonly _credentials: CredentialsProvider,
    private readonly _authenticator: Authenticator,
    private readonly _invitationManager: InvitationManager
  ) {
  }

  async start () {
    if (this._started) {
      return;
    }
    this._started = true;

    log('Start', this._partyKey.toHex());
    return this._networkManager.joinProtocolSwarm(this._partyKey.asBuffer(), ({ channel }: any) => this._createProtocol(channel));
  }

  async stop () {
    if (!this._started) {
      return;
    }
    this._started = false;

    log('Stop', this._partyKey.toHex());

    await this._networkManager.leaveProtocolSwarm(this._partyKey.asBuffer());
  }

  @synchronized
  private async _openFeed (key: FeedKey): Promise<hypercore.Feed> {
    return this._feedStore.getFeed(key) ?? await this._feedStore.createReadOnlyFeed(key, this._partyKey);
  }

  private _createProtocol (channel: any) {
    assert(this._identityManager.identityKey);
    assert(this._identityManager.deviceKey);
    const isHalo = this._identityManager.identityKey.publicKey.equals(this._partyKey);
    const plugins = [];

    // The Auth plugin must always come first.
    plugins.push(
      new AuthPlugin(
        this._identityManager.deviceKey.publicKey.asBuffer(),
        this._authenticator,
        [Replicator.extension]
      )
    );

    // This plugin allows for devices to re-join the HALO using a recovery seed phrase.
    if (isHalo) {
      plugins.push(
        new GreetingCommandPlugin(
          this._identityManager.deviceKey.publicKey.asBuffer(),
          HaloRecoveryInitiator.createHaloInvitationClaimHandler(this._identityManager)
        )
      );
    } else {
      plugins.push(
        new GreetingCommandPlugin(
          this._identityManager.deviceKey.publicKey.asBuffer(),
          OfflineInvitationClaimer.createOfflineInvitationClaimHandler(this._invitationManager)
        )
      );
    }

    // The Replicator plugin handles synchronizing feed content across participants.
    plugins.push(
      new Replicator({
        load: async () => {
          const partyFeeds = await Promise.all(this._activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
          log(`load feeds ${partyFeeds.map(feed => keyToString(feed.key))}`);
          return partyFeeds.map((feed) => {
            return { discoveryKey: feed.discoveryKey };
          });
        },

        subscribe: (addFeedToReplicatedSet: (feed: any) => void) => this._activeFeeds.added.on(async (feedKey) => {
          log(`add feed ${feedKey.toHex()}`);
          const feed = await this._openFeed(feedKey);
          addFeedToReplicatedSet({ discoveryKey: feed.discoveryKey });
        }),

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        replicate: async (remoteFeeds: any, info: any) => {
          // We can ignore remoteFeeds entirely, because the set of feeds we want to replicate is dictated by the Party.
          // TODO(telackey): why are we opening feeds? Necessary or belt/braces thinking, or because open party does it?
          log(`replicate: peerId=${info.session.peerId.toString('hex')}, feeds=${this._activeFeeds.get().map(key => key.toHex())}`);
          return Promise.all(this._activeFeeds.get().map(feedKey => this._openFeed(feedKey)));
        }
      })
    );

    const protocol = new Protocol({
      streamOptions: {
        live: true
      },

      discoveryToPublicKey: (dk: any) => {
        if (!discoveryKey(this._partyKey.asBuffer()).equals(dk)) {
          return undefined;
        }

        // TODO(marik-d): Why does this do side effects.
        // TODO(burdon): Remove need for external closure (i.e., pass object to this callback).
        protocol.setContext({ topic: this._partyKey.toHex() });
        return this._partyKey.asBuffer();
      }
    })
      .setSession({
        peerId: this._identityManager.deviceKey.publicKey.asBuffer(),
        // TODO(telackey): This ought to be the CredentialsProvider itself, so that fresh credentials can be minted.
        credentials: this._credentials.get().toString('base64')
      })
      .setExtensions(plugins.map(plugin => plugin.createExtension()))
      .init(channel);

    return protocol;
  }
}
