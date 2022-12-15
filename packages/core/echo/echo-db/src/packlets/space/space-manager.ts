//
// Copyright 2022 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { CredentialSigner, CredentialGenerator } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { Database, DataServiceSubscriptions } from '../database';
import { MetadataStore } from '../metadata';
import { Pipeline } from '../pipeline';
import { AuthProvider, AuthVerifier } from './auth';
import { DataPipelineController } from './data-pipeline-controller';
import { spaceGenesis } from './genesis';
import { Space } from './space';
import { SpaceProtocol, SwarmIdentity } from './space-protocol';

// TODO(burdon): ???
export interface AcceptSpaceOptions {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;
  controlFeedKey: PublicKey;
  dataFeedKey: PublicKey;
}

// TODO(burdon): Factor out to CredentialGenerator?
export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialProvider: AuthProvider;
  credentialAuthenticator: AuthVerifier;
  credentialSigner: CredentialSigner; // TODO(burdon): Already has keyring.
  profile?: ProfileDocument;
}

export type SpaceManagerParams = {
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
};

export type ConstructSpaceParams = {
  metadata: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  dataPipelineControllerProvider: () => DataPipelineController,
}

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
export class SpaceManager {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _networkManager: NetworkManager;

  constructor({
    feedStore,
    networkManager,
  }: SpaceManagerParams) {
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
  
  }

  @synchronized
  async close() {
    await Promise.all([...this._spaces.values()].map((space) => space.close()));
  }

  async constructSpace({ metadata, swarmIdentity, dataPipelineControllerProvider }: ConstructSpaceParams) {
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    const controlFeed = await this._feedStore.openFeed(metadata.controlFeedKey ?? failUndefined(), { writable: true });
    const dataFeed = await this._feedStore.openFeed(metadata.dataFeedKey ?? failUndefined(), { writable: true });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      identity: swarmIdentity,
      networkManager: this._networkManager
    });

    const space = new Space({
      spaceKey,
      protocol,
      genesisFeed,
      controlFeed,
      dataFeed,
      feedProvider: (feedKey) => this._feedStore.openFeed(feedKey),
      dataPipelineControllerProvider,
    });
    this._spaces.set(space.key, space);
    return space;
  }
}
