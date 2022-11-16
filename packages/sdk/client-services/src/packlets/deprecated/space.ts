//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { todo } from '@dxos/debug';
import {
  AuthenticateInvitationRequest,
  CreateSnapshotRequest,
  GetSpaceDetailsRequest,
  Space,
  SpaceDetails,
  SpaceService,
  SetSpaceStateRequest,
  SubscribeMembersRequest,
  SubscribeMembersResponse,
  SubscribeSpacesResponse,
  SubscribeSpaceRequest,
  SubscribeSpaceResponse
} from '@dxos/protocols/proto/dxos/client';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { humanize } from '@dxos/util';

import { ServiceContext } from '../services';
import { InviteeInvitations } from './invitations';

/**
 * Space service implementation.
 * @deprecated
 */
export class SpaceServiceImpl implements SpaceService {
  private inviteeInvitations: InviteeInvitations = new Map();

  constructor(private readonly serviceContext: ServiceContext) {}

  subscribeToSpace(request: SubscribeSpaceRequest): Stream<SubscribeSpaceResponse> {
    return new Stream(({ next }) => {
      next({
        space: {
          publicKey: request.spaceKey,
          isOpen: true,
          isActive: true,
          members: []
        }
      });
    });

    // const update = (next: (message: SubscribeSpaceResponse) => void) => {
    //   try {
    //     const space = this.echo.getSpace(request.space_key);
    //     next({
    //       space: space && {
    //         public_key: space.key,
    //         is_open: space.is_open,
    //         is_active: space.is_active,
    //         members: space.queryMembers().value
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

    // const space = this.serviceContext.brane.getSpace(request.space_key);
    // if (space) {
    //   return new Stream(({ next }) => space.update.on(() => update(next)));
    // } else {
    //   return new Stream(({ next }) => {
    //     let unsubscribeSpace: () => void;
    //     const unsubscribeSpaces = this.echo.querySpaces().subscribe((spaces) => {
    //       const space = spaces.find((space) => space.key.equals(request.space_key));
    //       if (space && !unsubscribeSpace) {
    //         unsubscribeSpace = space.update.on(() => update(next));
    //       }
    //     });

    //     update(next);

    //     return () => {
    //       unsubscribeSpaces();
    //       unsubscribeSpace?.();
    //     };
    //   });
    // }
  }

  subscribeSpaces() {
    return new Stream<SubscribeSpacesResponse>(({ next }) => {
      const subscriptions = new EventSubscriptions();

      const onUpdate = () => {
        next({
          spaces: Array.from(this.serviceContext.spaceManager!.spaces.values()).map(
            (space): Space => ({
              publicKey: space.key,
              isOpen: true,
              isActive: true,
              members: Array.from(space.spaceState.members.values()).map((member) => ({
                identityKey: member.key,
                profile: {
                  identityKey: member.key,
                  displayName: humanize(member.key)
                }
              }))
            })
          )
        });
      };

      setTimeout(async () => {
        if (!this.serviceContext.spaceManager) {
          next({ spaces: [] });
        }

        await this.serviceContext.initialized.wait();

        subscriptions.add(
          this.serviceContext.spaceManager!.updated.on(() => {
            this.serviceContext.spaceManager!.spaces.forEach((space) => {
              subscriptions.add(space.stateUpdate.on(onUpdate));
            });
            onUpdate();
          })
        );

        onUpdate();
      });

      return () => subscriptions.clear();
    });
  }

  async getSpaceDetails(request: GetSpaceDetailsRequest): Promise<SpaceDetails> {
    return todo();
    // const space = this.echo.getSpace(request.space_key) ?? raise(new SpaceNotFoundError(request.space_key));
    // return {
    //   processedTimeframe: space.timeframe
    // };
  }

  async createSpace(): Promise<Space> {
    await this.serviceContext.initialized.wait();
    const space = await this.serviceContext.spaceManager!.createSpace();
    return {
      publicKey: space.key,
      isOpen: true,
      isActive: true
    };
  }

  async cloneSpace(snapshot: SpaceSnapshot): Promise<Space> {
    return todo();
    // const space = await this.echo.cloneSpace(snapshot);
    // return {
    //   public_key: space.key,
    //   is_open: space.is_open,
    //   is_active: space.is_active
    // };
  }

  async setSpaceState(request: SetSpaceStateRequest) {
    return todo();
    // const space = this.echo.getSpace(request.space_key);
    // if (!space) {
    //   throw new Error('Space not found');
    // }

    // if (request.open === true) {
    //   await space.open();
    // } else if (request.open === false) {
    //   await space.close();
    // } // Undefined preserves previous state.

    // if (request.active_global === true) {
    //   await space.activate({ global: true });
    // } else if (request.active_global === false) {
    //   await space.deactivate({ global: true });
    // } // Undefined preserves previous state.

    // if (request.active_device === true) {
    //   await space.activate({ device: true });
    // } else if (request.active_device === false) {
    //   await space.deactivate({ device: true });
    // } // Undefined preserves previous state.
    // return {
    //   public_key: space.key,
    //   is_open: space.is_open,
    //   is_active: space.is_active
    // };
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
    // const space = this.echo.getSpace(request.space_key);
    // if (space) {
    //   return resultSetToStream(space.queryMembers(), (members): SubscribeMembersResponse => ({ members }));
    // } else {
    //   return new Stream(({ next }) => {
    //     let unsubscribeMembers: () => void;
    //     const unsubscribeSpaces = this.echo.querySpaces().subscribe((spaces) => {
    //       const space = spaces.find((space) => space.key.equals(request.space_key));
    //       if (!unsubscribeMembers && space) {
    //         const resultSet = space.queryMembers();
    //         next({ members: resultSet.value });
    //         unsubscribeMembers = resultSet.update.on(() => next({ members: resultSet.value }));
    //       }
    //     });

    //     return () => {
    //       unsubscribeSpaces();
    //       unsubscribeMembers();
    //     };
    //   });
    // }
  }

  async createSnapshot(request: CreateSnapshotRequest): Promise<SpaceSnapshot> {
    return todo();
    // assert(request.space_key);
    // const space = this.echo.getSpace(request.space_key) ?? raise(new SpaceNotFoundError(request.space_key));
    // return space.createSnapshot();
  }
}
