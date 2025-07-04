//
// Copyright 2023 DXOS.org
//

import { Trigger, sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Resource } from '@dxos/context';
import { createCredential, signPresentation } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import {
  type CreateIdentityRequest,
  type CreateRecoveryCredentialRequest,
  type Identity as IdentityProto,
  type IdentityService,
  type QueryIdentityResponse,
  type RecoverIdentityRequest,
  type SignPresentationRequest,
  SpaceState,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Presentation, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { safeAwaitAll } from '@dxos/util';

import { type Identity } from './identity';
import { type CreateIdentityOptions, type IdentityManager } from './identity-manager';
import { type EdgeIdentityRecoveryManager } from './identity-recovery-manager';
import { type DataSpaceManager } from '../spaces';

const DEFAULT_SPACE_SEARCH_TIMEOUT = 10_000;

export class IdentityServiceImpl extends Resource implements IdentityService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _recoveryManager: EdgeIdentityRecoveryManager,
    private readonly _keyring: Keyring,
    private readonly _dataSpaceManagerProvider: () => DataSpaceManager,
    private readonly _createIdentity: (params: CreateIdentityOptions) => Promise<Identity>,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {
    super();
  }

  protected override async _open(): Promise<void> {
    const identity = this._identityManager.identity;
    if (identity && !identity.defaultSpaceId) {
      await this._fixIdentityWithoutDefaultSpace(identity);
    }
  }

  async createIdentity(request: CreateIdentityRequest): Promise<IdentityProto> {
    await this._createIdentity({ profile: request.profile, deviceProfile: request.deviceProfile });
    const dataSpaceManager = this._dataSpaceManagerProvider();
    await this._createDefaultSpace(dataSpaceManager);
    return this._getIdentity()!;
  }

  private async _createDefaultSpace(dataSpaceManager: DataSpaceManager): Promise<void> {
    const space = await dataSpaceManager!.createDefaultSpace();
    const identity = this._identityManager.identity;
    invariant(identity);
    await identity.updateDefaultSpace(space.id);
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
      did: this._identityManager.identity.did,
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

  async createRecoveryCredential(request: CreateRecoveryCredentialRequest) {
    return this._recoveryManager.createRecoveryCredential(request);
  }

  async requestRecoveryChallenge() {
    return this._recoveryManager.requestRecoveryChallenge();
  }

  async recoverIdentity(request: RecoverIdentityRequest): Promise<IdentityProto> {
    if (request.recoveryCode) {
      await this._recoveryManager.recoverIdentity({ recoveryCode: request.recoveryCode });
    } else if (request.external) {
      await this._recoveryManager.recoverIdentityWithExternalSignature(request.external);
    } else if (request.token) {
      await this._recoveryManager.recoverIdentityWithToken({ token: request.token });
    } else {
      throw new Error('Invalid request.');
    }

    return this._getIdentity()!;
  }

  // TODO(burdon): Rename createPresentation?
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

  async createAuthCredential() {
    const identity = this._identityManager.identity;

    invariant(identity, 'Identity not initialized.');

    return await createCredential({
      assertion: { '@type': 'dxos.halo.credentials.Auth' },
      issuer: identity.identityKey,
      subject: identity.identityKey,
      chain: identity.deviceCredentialChain,
      signingKey: identity.deviceKey,
      signer: this._keyring,
    });
  }

  private async _fixIdentityWithoutDefaultSpace(identity: Identity): Promise<void> {
    let recodedDefaultSpace = false;
    let foundDefaultSpace = false;
    const dataSpaceManager = this._dataSpaceManagerProvider();

    const recordedDefaultSpaceTrigger = new Trigger();

    const allProcessed = safeAwaitAll(
      dataSpaceManager.spaces.values(),
      async (space) => {
        if (space.state === SpaceState.SPACE_CLOSED) {
          await space.open();

          // Wait until the space is either READY or REQUIRES_MIGRATION.
          // NOTE: Space could potentially never initialize if the space data is corrupted.
          const requiresMigration = space.stateUpdate.waitForCondition(
            () => space.state === SpaceState.SPACE_REQUIRES_MIGRATION,
          );
          await Promise.race([space.initializeDataPipeline(), requiresMigration]);
        }
        if (await dataSpaceManager.isDefaultSpace(space)) {
          if (foundDefaultSpace) {
            log.warn('Multiple default spaces found. Using the first one.', { duplicate: space.id });
            return;
          }

          foundDefaultSpace = true;
          await identity.updateDefaultSpace(space.id);
          recodedDefaultSpace = true;
          recordedDefaultSpaceTrigger.wake();
        }
      },
      (err) => {
        log.catch(err);
      },
    );

    // Wait for all spaces to be processed or until the default space is recorded.
    // If the timeout is reached, create a new default space.
    await Promise.race([allProcessed, recordedDefaultSpaceTrigger.wait(), sleep(DEFAULT_SPACE_SEARCH_TIMEOUT)]);

    if (!recodedDefaultSpace) {
      await this._createDefaultSpace(dataSpaceManager);
    }
  }
}
