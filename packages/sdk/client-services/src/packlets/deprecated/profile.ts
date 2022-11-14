//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { todo } from '@dxos/debug';
import {
  CreateProfileRequest,
  Profile,
  ProfileService,
  RecoverProfileRequest,
  SubscribeProfileResponse
} from '@dxos/protocols/proto/dxos/client';

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
                identityKey: this.context.identityManager.identity.identityKey
              }
            : undefined
        });

      emitNext();
      return this.context.identityManager.stateUpdate.on(emitNext);
    });
  }

  async createProfile(request: CreateProfileRequest): Promise<Profile> {
    await this.context.createIdentity();
    return { identityKey: this.context.identityManager.identity!.identityKey };
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
}
