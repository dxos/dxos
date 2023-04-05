//
// Copyright 2022 DXOS.org
//

import { synchronized, trackLeaks } from '@dxos/async';
import { CredentialSigner } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { NetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Credential, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Teleport } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { Space } from './space';
import { SpaceProtocol, SwarmIdentity } from './space-protocol';

// TODO(burdon): Factor out to DataSpaceManager
export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialSigner: CredentialSigner; // TODO(burdon): Already has keyring.
  recordCredential: (credential: Credential) => Promise<void>;
  profile?: ProfileDocument;
}

export type SpaceManagerParams = {
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
};

export type ConstructSpaceParams = {
  metadata: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  onNetworkConnection: (session: Teleport) => void;
};

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
@trackLeaks('open', 'close')
export class SpaceManager {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _networkManager: NetworkManager;
  private readonly _instanceId = PublicKey.random().toHex();
  public _traceParent?: string;

  constructor({ feedStore, networkManager }: SpaceManagerParams) {
    // TODO(burdon): Assert.
    this._feedStore = feedStore;
    this._networkManager = networkManager;
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    log.trace('dxos.echo.space-manager', trace.begin({ id: this._instanceId, parentId: this._traceParent }));
  }

  @synchronized
  async close() {
    await Promise.all([...this._spaces.values()].map((space) => space.close()));
    log.trace('dxos.echo.space-manager', trace.end({ id: this._instanceId }));
  }

  async constructSpace({ metadata, swarmIdentity, onNetworkConnection }: ConstructSpaceParams) {
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      swarmIdentity,
      networkManager: this._networkManager,
      onSessionAuth: onNetworkConnection
    });

    const space = new Space({
      spaceKey,
      protocol,
      genesisFeed,
      feedProvider: (feedKey) => this._feedStore.openFeed(feedKey)
    });
    this._spaces.set(space.key, space);
    return space;
  }
}
