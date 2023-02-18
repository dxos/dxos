//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { signPresentation } from '@dxos/credentials';
import { todo } from '@dxos/debug';
import {
  CreateProfileRequest,
  Profile,
  ProfileService,
  RecoverProfileRequest,
  SignPresentationRequest,
  SubscribeProfileResponse
} from '@dxos/protocols/proto/dxos/client';
import { Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

import { ServiceContext } from '../services';
import { InviteeInvitations } from './invitations';

/**
 * Profile service implementation.
 * @deprecated
 */
export class ProfileServiceImpl implements ProfileService {
  private inviteeInvitations: InviteeInvitations = new Map();

  constructor(private readonly context: ServiceContext) {}

  subscribeProfile(): Stream<SubscribeProfileResponse> {
    return new Stream(({ next }) => {
      const emitNext = () =>
        next({
          profile: this.context.identityManager.identity
            ? {
                identityKey: this.context.identityManager.identity.identityKey,
                deviceKey: this.context.identityManager.identity.deviceKey,
                displayName: this.context.identityManager.identity.profileDocument?.displayName,
                haloSpace: this.context.identityManager.identity.space.key
              }
            : undefined
        });

      emitNext();
      return this.context.identityManager.stateUpdate.on(emitNext);
    });
  }

  async createProfile(request: CreateProfileRequest): Promise<Profile> {
    await this.context.createIdentity({
      displayName: request.displayName
    });
    return {
      identityKey: this.context.identityManager.identity!.identityKey,
      deviceKey: this.context.identityManager.identity!.deviceKey,
      displayName: this.context.identityManager.identity!.profileDocument?.displayName,
      haloSpace: this.context.identityManager.identity!.space.key
    };
  }

  async recoverProfile(request: RecoverProfileRequest): Promise<Profile> {
    return todo();
    if (!request.seedPhrase) {
      throw new Error('Recovery SeedPhrase not provided.');
    }
    // await this.echo.open();
    // await this.echo.halo.recover(request.seed_phrase);
    // const profile = this.echo.halo.getProfile();
    // assert(profile, 'Recovering profile failed.');
    // return profile;
  }

  async signPresentation({ presentation, nonce }: SignPresentationRequest): Promise<Presentation> {
    assert(this.context.identityManager.identity, 'Identity not initialized.');
    return await signPresentation({
      presentation,
      signer: this.context.keyring,
      signerKey: this.context.identityManager.identity.deviceKey,
      chain: this.context.identityManager.identity.deviceCredentialChain,
      nonce
    });
  }
}
