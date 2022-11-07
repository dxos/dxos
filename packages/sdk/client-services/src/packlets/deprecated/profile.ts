//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { generatePasscode } from '@dxos/credentials';
import { todo } from '@dxos/debug';
import {
  AuthenticateInvitationRequest,
  CreateProfileRequest,
  InvitationRequest,
  InvitationState,
  Profile,
  ProfileService,
  RecoverProfileRequest,
  RedeemedInvitation,
  SubscribeProfileResponse
} from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../services';
import { InviteeInvitation, InviteeInvitations } from './invitations';

/**
 * Profile service implementation.
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

  createInvitation(): Stream<InvitationRequest> {
    return new Stream(({ next, close }) => {
      setTimeout(async () => {
        const secret = Buffer.from(generatePasscode());
        // TODO(burdon): Not used.
        // const secretProvider = async () => {
        //   next({ descriptor: invitation.toProto(), state: InvitationState.CONNECTED });
        //   return Buffer.from(secret);
        // };

        const invitation = await this.context.haloInvitations.createInvitation({
          onFinish: () => {
            next({ state: InvitationState.SUCCESS });
            close();
          }
        });
        invitation.secret = secret;

        next({
          state: InvitationState.WAITING_FOR_CONNECTION,
          descriptor: invitation
        });
      });
    });
  }

  acceptInvitation(invitation: Invitation): Stream<RedeemedInvitation> {
    return new Stream(({ next, close }) => {
      const id = v4();
      const [, secretTrigger] = latch();
      const inviteeInvitation: InviteeInvitation = { secretTrigger };

      // Secret will be provided separately (in AuthenticateInvitation).
      // Process will continue when `secretLatch` resolves, triggered by `secretTrigger`.
      // const secretProvider: SecretProvider = async () => {
      //   await secretLatch;
      //   const secret = inviteeInvitation.secret;
      //   if (!secret) {
      //     throw new Error('Secret not provided.');
      //   }
      //   return Buffer.from(secret);
      // };

      // Joining process is kicked off, and will await authentication with a secret.
      const haloPartyPromise = this.context.haloInvitations.acceptInvitation(invitation);
      this.inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise
        .then((identity) => {
          next({
            id,
            state: InvitationState.SUCCESS,
            partyKey: identity.identityKey
          });
        })
        .catch((err) => {
          next({ id, state: InvitationState.ERROR, error: String(err) });
        });
    });
  }

  async authenticateInvitation(request: AuthenticateInvitationRequest) {
    assert(request.processId, 'Process ID is missing.');
    const invitation = this.inviteeInvitations.get(request.processId);
    assert(invitation, 'Invitation not found.');
    assert(request.secret, 'Secret not provided.');

    // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
    invitation.secret = request.secret;
    invitation.secretTrigger?.();
  }
}
