//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { ECHO, InvitationDescriptor } from '@dxos/echo-db';

import {
  AuthenticateInvitationRequest,
  CreateProfileRequest,
  InvitationDescriptor as InvitationDescriptorProto,
  InvitationRequest,
  InvitationState,
  Profile,
  ProfileService as IProfileService,
  RecoverProfileRequest,
  RedeemedInvitation,
  SubscribeProfileResponse
} from '../../proto';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations } from './types';

/**
 * Profile service implementation.
 */
export class ProfileService implements IProfileService {
  private inviteeInvitations: InviteeInvitations = new Map();

  // TODO(burdon): Pass in HALO.
  constructor (
    private readonly echo: ECHO
  ) {}

  subscribeProfile (): Stream<SubscribeProfileResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({
        profile: this.echo.halo.isInitialized ? this.echo.halo.getProfile() : undefined
      });

      emitNext();
      return this.echo.halo.subscribeToProfile(emitNext);
    });
  }

  async createProfile (request: CreateProfileRequest) {
    return this.echo.halo.createProfile(request);
  }

  async recoverProfile (request: RecoverProfileRequest): Promise<Profile> {
    if (!request.seedPhrase) {
      throw new Error('Recovery SeedPhrase not provided.');
    }
    await this.echo.open();
    await this.echo.halo.recover(request.seedPhrase);
    const profile = this.echo.halo.getProfile();
    assert(profile, 'Recovering profile failed.');
    return profile;
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
        invitation = await this.echo.halo.createInvitation({
          secretProvider,
          secretValidator: defaultSecretValidator
        }, {
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
      const haloPartyPromise = this.echo.halo.join(InvitationDescriptor.fromProto(request), secretProvider);
      this.inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise.then(party => {
        next({ id, state: InvitationState.SUCCESS, partyKey: party.key });
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

export const createProfileService = ({ echo }: CreateServicesOpts): ProfileService => new ProfileService(echo);
