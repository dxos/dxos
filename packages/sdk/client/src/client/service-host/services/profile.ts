//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { ECHO, InvitationDescriptor } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import {
  InvitationState,
  ProfileService as IProfileService,
  AuthenticateInvitationRequest,
  SubscribeProfileResponse,
  InvitationRequest,
  CreateProfileRequest,
  Contacts,
  RedeemedInvitation,
  Profile
  , RecoverProfileRequest
} from '../../../proto/gen/dxos/client';
import { InvitationDescriptor as InvitationDescriptorProto } from '../../../proto/gen/dxos/echo/invitation';
import { encodeInvitation, resultSetToStream } from '../../../util';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations, InviterInvitations } from './interfaces';

export class ProfileService implements IProfileService {
  private inviteeInvitations: InviteeInvitations = new Map();

  constructor (private echo: ECHO) {}

  SubscribeProfile (): Stream<SubscribeProfileResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({
        profile: this.echo.halo.isInitialized ? this.echo.halo.getProfile() : undefined
      });

      emitNext();
      return this.echo.halo.subscribeToProfile(emitNext);
    });
  }

  async CreateProfile (request: CreateProfileRequest) {
    return this.echo.halo.createProfile(request);
  }

  async RecoverProfile (request: RecoverProfileRequest): Promise<Profile> {
    throw new Error('Not implemented');
  }

  CreateInvitation (): Stream<InvitationRequest> {
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

  AcceptInvitation (request: InvitationDescriptorProto): Stream<RedeemedInvitation> {
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

  async AuthenticateInvitation (request: AuthenticateInvitationRequest) {
    assert(request.processId, 'Process ID is missing.');
    const invitation = this.inviteeInvitations.get(request.processId);
    assert(invitation, 'Invitation not found.');
    assert(request.secret, 'Secret not provided.');

    // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
    invitation.secret = request.secret;
    invitation.secretTrigger?.();
  }

  SubscribeContacts (): Stream<Contacts> {
    if (this.echo.halo.isInitialized) {
      return resultSetToStream(this.echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
    } else {
      return new Stream(({ next }) => {
        const subGroup = new SubscriptionGroup();

        setImmediate(async () => {
          await this.echo.halo.identityReady.waitForCondition(() => this.echo.halo.isInitialized);

          const resultSet = this.echo.halo.queryContacts();
          next({ contacts: resultSet.value });
          subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
        });

        return () => subGroup.unsubscribe();
      });
    }
  }
}

export const createProfileService = ({ echo }: CreateServicesOpts): ProfileService => {
  return new ProfileService(echo);
};
