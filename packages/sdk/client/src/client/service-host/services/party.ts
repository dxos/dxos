//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { ECHO, EchoNotOpenError, InvitationDescriptor, PartyNotFoundError } from '@dxos/echo-db';

import {
  InvitationState,
  PartyService as IPartyService,
  SubscribeMembersResponse,
  SubscribePartiesResponse,
  SubscribePartyResponse,
  SubscribePartyRequest,
  SetPartyStateRequest,
  CreateInvitationRequest,
  AuthenticateInvitationRequest,
  InvitationRequest,
  RedeemedInvitation,
  SubscribeMembersRequest
} from '../../../proto/gen/dxos/client';
import { InvitationDescriptor as InvitationDescriptorProto } from '../../../proto/gen/dxos/echo/invitation';
import { encodeInvitation, resultSetToStream } from '../../../util';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations, InviterInvitations } from './interfaces';

class PartyService implements IPartyService {
  private inviterInvitations: InviterInvitations = [];
  private inviteeInvitations: InviteeInvitations = new Map();

  constructor (private echo: ECHO) {}

  SubscribeToParty (request: SubscribePartyRequest): Stream<SubscribePartyResponse> {
    const update = (next: (message: SubscribePartyResponse) => void) => {
      try {
        const party = this.echo.getParty(request.partyKey);
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

    const party = this.echo.getParty(request.partyKey);
    if (party) {
      return new Stream(({ next }) => {
        return party.update.on(() => update(next));
      });
    } else {
      return new Stream(({ next }) => {
        let unsubscribeParty: () => void;
        const unsubscribeParties = this.echo.queryParties().subscribe((parties) => {
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
  }

  SubscribeParties () {
    return resultSetToStream(this.echo.queryParties(), (parties): SubscribePartiesResponse => {
      return ({
        parties: parties.map(party => ({
          publicKey: party.key,
          isOpen: party.isOpen,
          isActive: party.isActive
        }))
      });
    });
  }

  async CreateParty () {
    const party = await this.echo.createParty();
    return {
      publicKey: party.key,
      isOpen: party.isOpen,
      isActive: party.isActive
    };
  }

  async SetPartyState (request: SetPartyStateRequest) {
    const party = this.echo.getParty(request.partyKey);
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
  }

  CreateInvitation (request: CreateInvitationRequest): Stream<InvitationRequest> {
    return new Stream(({ next, close }) => {
      const party = this.echo.getParty(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
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
          this.inviterInvitations.push({ invitationCode, secret });
          next({ state: InvitationState.WAITING_FOR_CONNECTION, descriptor: invitation.toProto() });
        } catch (error: any) {
          next({ state: InvitationState.ERROR, error: error.message });
          close();
        }
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
      const haloPartyPromise = this.echo.joinParty(InvitationDescriptor.fromProto(request), secretProvider);
      this.inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      haloPartyPromise.then(party => {
        next({ id, state: InvitationState.SUCCESS, partyKey: party.key });
      }).catch(err => {
        console.error(err);
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

  SubscribeMembers (request: SubscribeMembersRequest): Stream<SubscribeMembersResponse> {
    const party = this.echo.getParty(request.partyKey);
    if (party) {
      return resultSetToStream(party.queryMembers(), (members): SubscribeMembersResponse => ({ members }));
    } else {
      return new Stream(({ next }) => {
        let unsubscribeMembers: () => void;
        const unsubscribeParties = this.echo.queryParties().subscribe((parties) => {
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
}

export const createPartyService = ({ echo }: CreateServicesOpts): PartyService => {
  return new PartyService(echo);
};
