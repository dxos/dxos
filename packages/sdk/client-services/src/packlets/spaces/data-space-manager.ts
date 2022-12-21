//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import {
  AcceptSpaceOptions,
  DataServiceSubscriptions,
  MetadataStore,
  SigningContext,
  Space,
  SpaceManager,
  spaceGenesis
} from '@dxos/echo-db';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ComplexMap, deferFunction } from '@dxos/util';
import { Presence } from '@dxos/teleport-extension-presence';

import { createAuthProvider } from '../identity';
import { DataSpace } from './data-space';

export class DataSpaceManager {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _modelFactory: ModelFactory
  ) {}

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    await this._metadataStore.load();

    for (const spaceMetadata of this._metadataStore.spaces) {
      await this._constructSpace(spaceMetadata);
    }
  }

  @synchronized
  async close() {}

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace() {
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    log('creating space...', { spaceKey });
    const space = await this._constructSpace(metadata);

    await spaceGenesis(this._keyring, this._signingContext, space.inner);
    await this._metadataStore.addSpace(metadata);

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    assert(!this._spaces.has(opts.spaceKey), 'Space already exists.');

    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: opts.controlFeedKey,
      dataFeedKey: opts.dataFeedKey
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);
    this.updated.emit();
    return space;
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    const presence = new Presence({
      localPeerId: this._signingContext.deviceKey,
      announceInterval: 1_000,
      offlineTimeout: 30_000,
      identityKey: this._signingContext.identityKey
    });
    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: createAuthProvider(this._signingContext.credentialSigner),
        credentialAuthenticator: deferFunction(() => dataSpace.authVerifier.verifier)
      },
      dataPipelineControllerProvider: () => dataSpace.dataPipelineController,
      presence
    });
    const dataSpace = new DataSpace(space, this._modelFactory, this._signingContext.identityKey, presence);
    await space.open();
    this._dataServiceSubscriptions.registerSpace(space.key, dataSpace.database.createDataServiceHost());
    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}
