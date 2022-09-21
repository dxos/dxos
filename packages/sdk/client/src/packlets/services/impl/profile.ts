//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { generatePasscode, SecretProvider } from '@dxos/credentials';
import { Fubar, InvitationDescriptor } from '@dxos/echo-db';
import {
  AuthenticateInvitationRequest,
  CreateProfileRequest,
  InvitationRequest,
  InvitationState,
  Profile,
  ProfileService as ProfileServiceRpc,
  RecoverProfileRequest,
  RedeemedInvitation,
  SubscribeProfileResponse
} from '@dxos/protocols/proto/dxos/client';
import { InvitationDescriptor as InvitationDescriptorProto } from '@dxos/protocols/proto/dxos/echo/invitation';

import { todo } from '@dxos/debug';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations } from './types';

/**
 * Profile service implementation.
 */
export class ProfileService implements ProfileServiceRpc {
  private inviteeInvitations: InviteeInvitations = new Map();

  constructor (
    private readonly fubar: Fubar
  ) {}

  subscribeProfile (): Stream<SubscribeProfileResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({
        profile: this.fubar.identityManager.identity ? { publicKey: this.fubar.identityManager.identity.identityKey } : undefined,
      });

      emitNext();
      return this.fubar.identityManager.stateUpdate.on(emitNext);
    });
  }

  async createProfile (request: CreateProfileRequest) {
    await this.fubar.createIdentity();
    return { publicKey: this.fubar.identityManager.identity!.identityKey }
  }

  async recoverProfile (request: RecoverProfileRequest): Promise<Profile> {
    return todo()
    if (!request.seedPhrase) {
      throw new Error('Recovery SeedPhrase not provided.');
    }
    // await this.echo.open();
    // await this.echo.halo.recover(request.seedPhrase);
    // const profile = this.echo.halo.getProfile();
    // assert(profile, 'Recovering profile failed.');
    // return profile;
  }

  createInvitation (): Stream<InvitationRequest> {
    return new Stream(({ next, close }) => {
      setImmediate(async () => {
        const secret = Buffer.from(generatePasscode());
        let invitation: InvitationDescriptor; // eslint-disable-line prefer-const
        const secretProvider = async () => {
          next({ descriptor: invitation.toProto(), state: InvitationState.CONNECTED });
          return Buffer.from(secret);
        };
        invitation = await this.fubar.createInvitation({
          onFinish: () => {
            next({ state: InvitationState.SUCCESS });
            close();
          }
        });
        invitation.secret = secret;
        next({ descriptor: invitation.toProto(), state: InvitationState.WAITING_FOR_CONNECTION });
      });
    });
  }

  acceptInvitation (request: InvitationDescriptorProto): Stream<RedeemedInvitation> {
    return new Stream(({ next, close }) => {
      const id = v4();
      const [secretLatch, secretTrigger] = latch();
      const inviteeInvitation: InviteeInvitation = { secretTrigger };

      // Secret will be provided separately (in AuthenticateInvitation).
      // Process will continue when `secretLatch` resolves, triggered by `secretTrigger`.
      const secretProvider: SecretProvider = async () => {
        await secretLatch;
        const secret = inviteeInvitation.secret;
        if (!secret) {
          throw new Error('Secret not provided.');
        }
        return Buffer.from(secret);
      };

      // Joining process is kicked off, and will await authentication with a secret.
      const haloPartyPromise = this.fubar.join(InvitationDescriptor.fromProto(request));
      this.inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise.then(identity => {
        next({ id, state: InvitationState.SUCCESS, partyKey: identity.identityKey });
      }).catch(err => {
        next({ id, state: InvitationState.ERROR, error: String(err) });
      });
    });
  }

  async authenticateInvitation (request: AuthenticateInvitationRequest) {
    assert(request.processId, 'Process ID is missing.');
    const invitation = this.inviteeInvitations.get(request.processId);
    assert(invitation, 'Invitation not found.');
    assert(request.secret, 'Secret not provided.');

    // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
    invitation.secret = request.secret;
    invitation.secretTrigger?.();
  }
}

export const createProfileService = ({ fubar }: CreateServicesOpts): ProfileService => new ProfileService(fubar);
