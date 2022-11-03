//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { todo } from '@dxos/debug';
import {
  AuthenticateInvitationRequest,
  CreateInvitationRequest,
  CreateSnapshotRequest,
  GetPartyDetailsRequest,
  InvitationRequest,
  InvitationState,
  Party,
  PartyDetails,
  PartyService as PartyServiceRpc,
  RedeemedInvitation,
  SetPartyStateRequest,
  SubscribeMembersRequest,
  SubscribeMembersResponse,
  SubscribePartiesResponse,
  SubscribePartyRequest,
  SubscribePartyResponse
} from '@dxos/protocols/proto/dxos/client/services';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import type { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationWrapper, InviteeInvitation, InviteeInvitations } from '../../invitations';
import { ServiceContext } from '../service-context';

/**
 * Party service implementation.
 */
// TODO(burdon): Rename DataService vs. DatabaseService?
export class SpaceService implements PartyServiceRpc {
  private inviteeInvitations: InviteeInvitations = new Map();

  // prettier-ignore
  constructor(
    private readonly serviceContext: ServiceContext
  ) {}

  subscribeToParty(request: SubscribePartyRequest): Stream<SubscribePartyResponse> {
    return new Stream(({ next }) => {
      next({
        party: {
          publicKey: request.spaceKey,
          isOpen: true,
          isActive: true,
          members: []
        }
      });
    });

    // const update = (next: (message: SubscribePartyResponse) => void) => {
    //   try {
    //     const party = this.echo.getParty(request.space_key);
    //     next({
    //       party: party && {
    //         public_key: party.key,
    //         is_open: party.is_open,
    //         is_active: party.is_active,
    //         members: party.queryMembers().value
    //       }
    //     });
    //   } catch (err) {
    //     if (err instanceof InvalidStateError) {
    //       // Do nothing.
    //     } else {
    //       throw err;
    //     }
    //   }
    // };

    // const party = this.serviceContext.brane.getParty(request.space_key);
    // if (party) {
    //   return new Stream(({ next }) => party.update.on(() => update(next)));
    // } else {
    //   return new Stream(({ next }) => {
    //     let unsubscribeParty: () => void;
    //     const unsubscribeParties = this.echo.queryParties().subscribe((parties) => {
    //       const party = parties.find((party) => party.key.equals(request.space_key));
    //       if (party && !unsubscribeParty) {
    //         unsubscribeParty = party.update.on(() => update(next));
    //       }
    //     });

    //     update(next);

    //     return () => {
    //       unsubscribeParties();
    //       unsubscribeParty?.();
    //     };
    //   });
    // }
  }

  subscribeParties() {
    return new Stream<SubscribePartiesResponse>(({ next }) => {
      const update = () => {
        next({
          parties: Array.from(this.serviceContext.spaceManager!.spaces.values()).map((space) => ({
            publicKey: space.key,
            isOpen: true,
            isActive: true
          }))
        });
      };

      setTimeout(async () => {
        if (!this.serviceContext.spaceManager) {
          next({ parties: [] });
        }

        await this.serviceContext.initialized.wait();

        update();
        return this.serviceContext.spaceManager!.update.on(update);
      });
    });
  }

  async getPartyDetails(request: GetPartyDetailsRequest): Promise<PartyDetails> {
    return todo();
    // const party = this.echo.getParty(request.space_key) ?? raise(new SpaceNotFoundError(request.space_key));
    // return {
    //   processedTimeframe: party.timeframe
    // };
  }

  async createParty(): Promise<Party> {
    await this.serviceContext.initialized.wait();
    const space = await this.serviceContext.spaceManager!.createSpace();
    return {
      publicKey: space.key,
      isOpen: true,
      isActive: true
    };
  }

  async cloneParty(snapshot: PartySnapshot): Promise<Party> {
    return todo();
    // const party = await this.echo.cloneParty(snapshot);
    // return {
    //   public_key: party.key,
    //   is_open: party.is_open,
    //   is_active: party.is_active
    // };
  }

  async setPartyState(request: SetPartyStateRequest) {
    return todo();
    // const party = this.echo.getParty(request.space_key);
    // if (!party) {
    //   throw new Error('Party not found');
    // }

    // if (request.open === true) {
    //   await party.open();
    // } else if (request.open === false) {
    //   await party.close();
    // } // Undefined preserves previous state.

    // if (request.active_global === true) {
    //   await party.activate({ global: true });
    // } else if (request.active_global === false) {
    //   await party.deactivate({ global: true });
    // } // Undefined preserves previous state.

    // if (request.active_device === true) {
    //   await party.activate({ device: true });
    // } else if (request.active_device === false) {
    //   await party.deactivate({ device: true });
    // } // Undefined preserves previous state.
    // return {
    //   public_key: party.key,
    //   is_open: party.is_open,
    //   is_active: party.is_active
    // };
  }

  createInvitation(request: CreateInvitationRequest): Stream<InvitationRequest> {
    return new Stream(({ next, close }) => {
      setTimeout(async () => {
        try {
          let invitation: InvitationWrapper;
          if (!request.inviteeKey) {
            // const secret = Buffer.from(generatePasscode());
            // const secretProvider = async () => {
            //   next({ state: InvitationState.CONNECTED });
            //   return Buffer.from(secret);
            // };
            invitation = await this.serviceContext.createInvitation(request.spaceKey, () => {
              next({ state: InvitationState.SUCCESS });
              close();
            });

            assert(invitation.type === Invitation.Type.INTERACTIVE);
            // invitation.secret = Buffer.from(secret);
          } else {
            todo();
            // invitation = await party.invitationManager.createOfflineInvitation(request.invitee_key);
          }

          // TODO(burdon): Change stream type.
          next({
            state: InvitationState.CONNECTING,
            descriptor: invitation!.toProto()
          });

          // if (invitation.type === Invitation.Type.OFFLINE) {
          //   close();
          // }
        } catch (err: any) {
          next({ state: InvitationState.ERROR, error: err.message });
          close();
        }
      });
    });
  }

  acceptInvitation(request: Invitation): Stream<RedeemedInvitation> {
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
      const partyPromise = this.serviceContext.acceptInvitation(InvitationWrapper.fromProto(request));
      this.inviteeInvitations.set(id, inviteeInvitation);
      next({ id, state: InvitationState.CONNECTED });

      partyPromise
        .then((party) => {
          next({ id, state: InvitationState.SUCCESS, spaceKey: party.key });
        })
        .catch((err) => {
          console.error(err);
          next({ id, state: InvitationState.ERROR, error: String(err) });
        })
        .finally(() => {
          close();
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

  subscribeMembers(request: SubscribeMembersRequest): Stream<SubscribeMembersResponse> {
    return new Stream(({ next }) => {
      next({
        members: []
      });
    });
    // const party = this.echo.getParty(request.space_key);
    // if (party) {
    //   return resultSetToStream(party.queryMembers(), (members): SubscribeMembersResponse => ({ members }));
    // } else {
    //   return new Stream(({ next }) => {
    //     let unsubscribeMembers: () => void;
    //     const unsubscribeParties = this.echo.queryParties().subscribe((parties) => {
    //       const party = parties.find((party) => party.key.equals(request.space_key));
    //       if (!unsubscribeMembers && party) {
    //         const resultSet = party.queryMembers();
    //         next({ members: resultSet.value });
    //         unsubscribeMembers = resultSet.update.on(() => next({ members: resultSet.value }));
    //       }
    //     });

    //     return () => {
    //       unsubscribeParties();
    //       unsubscribeMembers();
    //     };
    //   });
    // }
  }

  async createSnapshot(request: CreateSnapshotRequest): Promise<PartySnapshot> {
    return todo();
    // assert(request.space_key);
    // const party = this.echo.getParty(request.space_key) ?? raise(new SpaceNotFoundError(request.space_key));
    // return party.createSnapshot();
  }
}
