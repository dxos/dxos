//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { createCredentialSignerWithKey, CredentialGenerator } from '@dxos/credentials';
import { MetadataStore, NoopDataPipelineController, SpaceManager, SwarmIdentity } from '@dxos/echo-db';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AdmittedFeed, IdentityRecord, SpaceRecord } from '@dxos/protocols/proto/dxos/halo/credentials';
import { deferFunction } from '@dxos/util';

import { Identity } from '../identity';
import { createAuthProvider } from './authenticator';

interface ConstructSpaceParams {
  spaceRecord: SpaceRecord;
  swarmIdentity: SwarmIdentity;
}

export type JoinIdentityParams = {
  identityKey: PublicKey;
  haloSpaceKey: PublicKey;
  haloGenesisFeedKey: PublicKey;
};

export type CreateIdentityOptions = {
  displayName?: string;
};

// TODO(dmaretskyi): Rename: represents the peer's state machine.
export class IdentityManager {
  readonly stateUpdate = new Event();

  private _identity?: Identity;

  // TODO(burdon): IdentityManagerParams.
  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor(
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _spaceManager: SpaceManager
  ) {}

  get identity() {
    return this._identity;
  }

  async open() {
    await this._metadataStore.load();

    const identityRecord = this._metadataStore.getIdentityRecord();
    if (identityRecord) {
      this._identity = await this._constructIdentity(identityRecord);
      await this._identity.open();
      await this._identity.ready();
      this.stateUpdate.emit();
    }
  }

  async close() {
    await this._identity?.close();
  }

  async createIdentity({ displayName }: CreateIdentityOptions = {}) {
    assert(!this._identity, 'Identity already exists.');
    log('creating identity...');

    const controlFeedKey = await this._keyring.createKey();
    const identityRecord: IdentityRecord = {
      identityKey: await this._keyring.createKey(),
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        spaceKey: await this._keyring.createKey(),
        genesisFeedKey: controlFeedKey,
        writeControlFeedKey: controlFeedKey,
        writeDataFeedKey: await this._keyring.createKey()
      }
    };

    const identity = await this._constructIdentity(identityRecord);
    await identity.open();

    {
      const generator = new CredentialGenerator(this._keyring, identityRecord.identityKey, identityRecord.deviceKey);
      const credentials = [
        // Space genesis.
        ...(await generator.createSpaceGenesis(
          identityRecord.haloSpace.spaceKey,
          identityRecord.haloSpace.genesisFeedKey
        )),

        // Feed admission.
        await generator.createFeedAdmission(
          identityRecord.haloSpace.spaceKey,
          identityRecord.haloSpace.writeDataFeedKey,
          AdmittedFeed.Designation.DATA
        )
      ];

      if (displayName) {
        credentials.push(await generator.createProfileCredential({ displayName }));
      }

      // Device authorization (writes device chain).
      // NOTE: This credential is written last. This is a hack to make sure that display name is set before identity is "ready".
      credentials.push(await generator.createDeviceAuthorization(identityRecord.deviceKey));

      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // TODO(burdon): ???
    // await this._keyring.deleteKey(identityRecord.identity_key);
    // await this._keyring.deleteKey(identityRecord.halo_space.space_key);

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready();
    this.stateUpdate.emit();

    log('created identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
    return identity;
  }

  /**
   * Accept an existing identity. Expects it's device key to be authorized (now or later).
   */
  async acceptIdentity(params: JoinIdentityParams) {
    log('accepting identity', { params });
    assert(!this._identity, 'Identity already exists.');

    const identityRecord: IdentityRecord = {
      identityKey: params.identityKey,
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        spaceKey: params.haloSpaceKey,
        genesisFeedKey: params.haloGenesisFeedKey,
        writeControlFeedKey: await this._keyring.createKey(),
        writeDataFeedKey: await this._keyring.createKey()
      }
    };
    const identity = await this._constructIdentity(identityRecord);

    await identity.open();
    this._identity = identity;
    await this._metadataStore.setIdentityRecord(identityRecord);
    this.stateUpdate.emit();
    return identity;
  }

  private async _constructIdentity(identityRecord: IdentityRecord) {
    assert(!this._identity);
    log('constructing identity', { identityRecord });

    const space = await this._constructSpace({
      spaceRecord: identityRecord.haloSpace,
      swarmIdentity: {
        peerKey: identityRecord.deviceKey,
        credentialProvider: createAuthProvider(
          createCredentialSignerWithKey(this._keyring, identityRecord.deviceKey)
        ),
        credentialAuthenticator: deferFunction(() => identity.authVerifier.verifier)
      }
    });
    const identity: Identity = new Identity({
      space,
      signer: this._keyring,
      identityKey: identityRecord.identityKey,
      deviceKey: identityRecord.deviceKey
    });
    log('done', { identityKey: identityRecord.identityKey });

    return identity;
  }

  private async _constructSpace({ spaceRecord, swarmIdentity }: ConstructSpaceParams) {
    return this._spaceManager.constructSpace({
      metadata: {
        key: spaceRecord.spaceKey,
        genesisFeedKey: spaceRecord.genesisFeedKey,
        controlFeedKey: spaceRecord.writeControlFeedKey,
        dataFeedKey: spaceRecord.writeDataFeedKey
      },
      dataPipelineControllerProvider: () => new NoopDataPipelineController(),
      swarmIdentity
    });
  }
}
