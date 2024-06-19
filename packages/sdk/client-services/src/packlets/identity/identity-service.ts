//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { signPresentation } from '@dxos/credentials';
import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import {
  type CreateIdentityRequest,
  type Identity as IdentityProto,
  type IdentityService,
  type QueryIdentityResponse,
  type RecoverIdentityRequest,
  type SignPresentationRequest,
  SpaceState,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Presentation, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type Identity } from './identity';
import { type CreateIdentityOptions, type IdentityManager } from './identity-manager';
import { type DataSpaceManager } from '../spaces';

export class IdentityServiceImpl extends Resource implements IdentityService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _keyring: Keyring,
    private readonly _dataSpaceManagerProvider: () => DataSpaceManager,
    private readonly _createIdentity: (params: CreateIdentityOptions) => Promise<Identity>,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {
    super();
  }

  protected override async _open() {
    const identity = this._identityManager.identity;
    if (identity && !identity.defaultSpaceId) {
      await this._fixIdentityWithoutDefaultSpace(identity);
    }
  }

  async createIdentity(request: CreateIdentityRequest): Promise<IdentityProto> {
    await this._createIdentity({ displayName: request.profile?.displayName, deviceProfile: request.deviceProfile });
    const dataSpaceManager = this._dataSpaceManagerProvider();
    await this._createDefaultSpace(dataSpaceManager);
    return this._getIdentity()!;
  }

  private async _createDefaultSpace(dataSpaceManager: DataSpaceManager) {
    const space = await dataSpaceManager!.createDefaultSpace();
    const identity = this._identityManager.identity;
    invariant(identity);
    await identity.updateDefaultSpace(space.id);
  }

  async recoverIdentity(request: RecoverIdentityRequest): Promise<IdentityProto> {
    return todo();
  }

  queryIdentity(): Stream<QueryIdentityResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({ identity: this._getIdentity() });

      emitNext();
      return this._identityManager.stateUpdate.on(emitNext);
    });
  }

  private _getIdentity(): IdentityProto | undefined {
    if (!this._identityManager.identity) {
      return undefined;
    }

    return {
      identityKey: this._identityManager.identity.identityKey,
      spaceKey: this._identityManager.identity.space.key,
      profile: this._identityManager.identity.profileDocument,
    };
  }

  async updateProfile(profile: ProfileDocument): Promise<IdentityProto> {
    invariant(this._identityManager.identity, 'Identity not initialized.');
    await this._identityManager.updateProfile(profile);
    await this._onProfileUpdate?.(this._identityManager.identity.profileDocument);
    return this._getIdentity()!;
  }

  async signPresentation({ presentation, nonce }: SignPresentationRequest): Promise<Presentation> {
    invariant(this._identityManager.identity, 'Identity not initialized.');

    return await signPresentation({
      presentation,
      signer: this._keyring,
      signerKey: this._identityManager.identity.deviceKey,
      chain: this._identityManager.identity.deviceCredentialChain,
      nonce,
    });
  }

  private async _fixIdentityWithoutDefaultSpace(identity: Identity) {
    let hasDefaultSpace = false;
    const dataSpaceManager = this._dataSpaceManagerProvider();
    for (const space of dataSpaceManager.spaces.values()) {
      if (space.state === SpaceState.CLOSED) {
        await space.open();

        // Wait until the space is either READY or REQUIRES_MIGRATION.
        const requiresMigration = space.stateUpdate.waitForCondition(
          () => space.state === SpaceState.REQUIRES_MIGRATION,
        );
        await Promise.race([space.initializeDataPipeline(), requiresMigration]);
      }
      if (await dataSpaceManager.isDefaultSpace(space)) {
        await identity.updateDefaultSpace(space.id);
        hasDefaultSpace = true;
        break;
      }
    }
    if (!hasDefaultSpace) {
      await this._createDefaultSpace(dataSpaceManager);
    }
  }
}
