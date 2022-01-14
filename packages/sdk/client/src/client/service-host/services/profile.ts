//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { InvitationDescriptor } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { Contacts, InvitationState, ProfileService } from '../../../proto/gen/dxos/client';
import { encodeInvitation, resultSetToStream } from '../../../util';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations, InviterInvitations } from './interfaces';

export const createProfileService = ({ echo }: CreateServicesOpts): ProfileService => {
  const inviterInvitations: InviterInvitations = [];
  const inviteeInvitations: InviteeInvitations = new Map();

  return {
    SubscribeProfile: () => new Stream(({ next }) => {
      const emitNext = () => next({
        profile: echo.halo.isInitialized ? echo.halo.getProfile() : undefined
      });

      emitNext();
      return echo.halo.subscribeToProfile(emitNext);
    }),
    CreateProfile: async (opts) => {
      return echo.halo.createProfile(opts);
    },
    RecoverProfile: () => {
      throw new Error('Not implemented');
    },
    CreateInvitation: () => new Stream(({ next, close }) => {
      setImmediate(async () => {
        const secret = Buffer.from(generatePasscode());
        let invitation: InvitationDescriptor; // eslint-disable-line prefer-const
        const secretProvider = async () => {
          next({ descriptor: invitation.toProto(), state: InvitationState.CONNECTED });
          return Buffer.from(secret);
        };
        invitation = await echo.halo.createInvitation({
          secretProvider,
          secretValidator: defaultSecretValidator
        }, {
          onFinish: () => {
            next({ state: InvitationState.SUCCESS });
            close();
          }
        });
        invitation.secret = secret;
        const invitationCode = encodeInvitation(invitation);
        inviterInvitations.push({ invitationCode, secret: invitation.secret });
        next({ descriptor: invitation.toProto(), state: InvitationState.WAITING_FOR_CONNECTION });
      });
    }),
    AcceptInvitation: (request) => new Stream(({ next, close }) => {
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
      const haloPartyPromise = echo.halo.join(InvitationDescriptor.fromProto(request), secretProvider);
      inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise.then(party => {
        next({ id, state: InvitationState.SUCCESS, partyKey: party.key });
      }).catch(err => {
        next({ id, state: InvitationState.ERROR, error: String(err) });
      });
    }),
    AuthenticateInvitation: async (request) => {
      assert(request.processId, 'Process ID is missing.');
      const invitation = inviteeInvitations.get(request.processId);
      assert(invitation, 'Invitation not found.');
      assert(request.secret, 'Secret not provided.');

      // Supply the secret, and move the internal invitation process by triggering the secretTrigger.
      invitation.secret = request.secret;
      invitation.secretTrigger?.();
    },
    SubscribeContacts: () => {
      if (echo.halo.isInitialized) {
        return resultSetToStream(echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
      } else {
        return new Stream(({ next }) => {
          const subGroup = new SubscriptionGroup();

          setImmediate(async () => {
            await echo.halo.identityReady.waitForCondition(() => echo.halo.isInitialized);

            const resultSet = echo.halo.queryContacts();
            next({ contacts: resultSet.value });
            subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
          });

          return () => subGroup.unsubscribe();
        });
      }
    }
  };
};
