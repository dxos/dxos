//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { EchoNotOpenError, InvitationDescriptor, PartyNotFoundError } from '@dxos/echo-db';

import { InvitationState, PartyService, SubscribeMembersResponse, SubscribePartiesResponse, SubscribePartyResponse } from '../../../proto/gen/dxos/client';
import { encodeInvitation, resultSetToStream } from '../../../util';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations, InviterInvitations } from './interfaces';

export const createPartyService = ({ echo }: CreateServicesOpts): PartyService => {
  const inviterInvitations: InviterInvitations = [];
  const inviteeInvitations: InviteeInvitations = new Map();

  return {
    SubscribeToParty: (request) => {
      const update = (next: (message: SubscribePartyResponse) => void) => {
        try {
          const party = echo.getParty(request.partyKey);
          next({
            party: party && {
              publicKey: party.key,
              isOpen: party.isOpen,
              isActive: party.isActive
            }
          });
        } catch (error) {
          if (error instanceof EchoNotOpenError) {
            // Do nothing.
          } else {
            throw error;
          }
        }
      };

      const party = echo.getParty(request.partyKey);
      if (party) {
        return new Stream(({ next }) => {
          return party.update.on(() => update(next));
        });
      } else {
        return new Stream(({ next }) => {
          let unsubscribeParty: () => void;
          const unsubscribeParties = echo.queryParties().subscribe((parties) => {
            const party = parties.find((party) => party.key.equals(request.partyKey));
            if (party && !unsubscribeParty) {
              unsubscribeParty = party.update.on(() => update(next));
            }
          });

          update(next);

          return () => {
            unsubscribeParties();
            unsubscribeParty?.();
          };
        });
      }
    },
    SubscribeParties: () => {
      return resultSetToStream(echo.queryParties(), (parties): SubscribePartiesResponse => {
        return ({
          parties: parties.map(party => ({
            publicKey: party.key,
            isOpen: party.isOpen,
            isActive: party.isActive
          }))
        });
      });
    },
    CreateParty: async () => {
      const party = await echo.createParty();
      return {
        publicKey: party.key,
        isOpen: party.isOpen,
        isActive: party.isActive
      };
    },
    SetPartyState: async (request) => {
      const party = echo.getParty(request.partyKey);
      if (!party) {
        throw new Error('Party not found');
      }

      if (request.open === true) {
        await party.open();
      } else if (request.open === false) {
        await party.close();
      } // Undefined preserves previous state.

      if (request.activeGlobal === true) {
        await party.activate({ global: true });
      } else if (request.activeGlobal === false) {
        await party.deactivate({ global: true });
      } // Undefined preserves previous state.

      if (request.activeDevice === true) {
        await party.activate({ device: true });
      } else if (request.activeDevice === false) {
        await party.deactivate({ device: true });
      } // Undefined preserves previous state.
      return {
        publicKey: party.key,
        isOpen: party.isOpen,
        isActive: party.isActive
      };
    },
    CreateInvitation: (request) => new Stream(({ next, close }) => {
      const party = echo.getParty(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
      setImmediate(async () => {
        try {
          const secret = Buffer.from(generatePasscode());
          const secretProvider = async () => {
            next({ state: InvitationState.CONNECTED });
            return Buffer.from(secret);
          };
          const invitation = await party.createInvitation({
            secretProvider,
            secretValidator: defaultSecretValidator
          }, {
            onFinish: () => {
              next({ state: InvitationState.SUCCESS });
              close();
            }
          });
          invitation.secret = Buffer.from(secret);
          const invitationCode = encodeInvitation(invitation);
          inviterInvitations.push({ invitationCode, secret });
          next({ state: InvitationState.WAITING_FOR_CONNECTION, descriptor: invitation.toProto() });
        } catch (error: any) {
          next({ state: InvitationState.ERROR, error: error.message });
          close();
        }
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
      const haloPartyPromise = echo.joinParty(InvitationDescriptor.fromProto(request), secretProvider);
      inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise.then(party => {
        next({ id, state: InvitationState.SUCCESS, partyKey: party.key });
      }).catch(err => {
        console.error(err);
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
    SubscribeMembers: (request) => {
      const party = echo.getParty(request.partyKey);
      if (party) {
        return resultSetToStream(party.queryMembers(), (members): SubscribeMembersResponse => ({ members }));
      } else {
        return new Stream(({ next }) => {
          let unsubscribeMembers: () => void;
          const unsubscribeParties = echo.queryParties().subscribe((parties) => {
            const party = parties.find((party) => party.key.equals(request.partyKey));
            if (!unsubscribeMembers && party) {
              const resultSet = party.queryMembers();
              next({ members: resultSet.value });
              unsubscribeMembers = resultSet.update.on(() => next({ members: resultSet.value }));
            }
          });

          return () => {
            unsubscribeParties();
            unsubscribeMembers();
          };
        });
      }
    }
  };
};
