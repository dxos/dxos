//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { todo } from '@dxos/debug';
import { log } from '@dxos/log';
import {
  AuthenticateInvitationRequest,
  CreateSnapshotRequest,
  GetSpaceDetailsRequest,
  Space,
  SpaceMember,
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
    return new Stream<SubscribeSpacesResponse>(({ next, ctx }) => {
      const onUpdate = () => {
        const spaces = Array.from(this.serviceContext.dataSpaceManager!.spaces.values())
          .filter((space) => this.serviceContext.dataServiceSubscriptions.getDataService(space.key)) // Skip spaces without data service available.
          .map(
            (space): Space => ({
              publicKey: space.key,
              isOpen: true,
              isActive: true,
              members: Array.from(space.inner.spaceState.members.values()).map((member) => ({
                identityKey: member.key,
                profile: {
                  identityKey: member.key,
                  displayName: member.assertion.profile?.displayName ?? humanize(member.key)
                },
                presence:
                  this.serviceContext.identityManager.identity?.identityKey.equals(member.key) ||
                  space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
                    ? SpaceMember.PresenceState.ONLINE
                    : SpaceMember.PresenceState.OFFLINE
              }))
            })
          );
        log('update', { spaces });
        next({ spaces });
      };

      setTimeout(async () => {
        if (!this.serviceContext.dataSpaceManager) {
          next({ spaces: [] });
        }

        await this.serviceContext.initialized.wait();

        // TODO(dmaretskyi): Create a pattern for subscribing to a set of objects.
        const subscribeSpaces = () => {
          for (const space of this.serviceContext.dataSpaceManager!.spaces.values()) {
            if (!this.serviceContext.dataServiceSubscriptions.getDataService(space.key)) {
              // Skip spaces without data service available.
              continue;
            }

            space.stateUpdate.on(ctx, onUpdate);
            space.presence.updated.on(ctx, onUpdate);
          }
        };

        this.serviceContext.dataSpaceManager!.updated.on(ctx, () => {
          subscribeSpaces();
          onUpdate();
        });

        subscribeSpaces();
        onUpdate();
      });
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
    if (!this.serviceContext.identityManager.identity) {
      throw new Error('This device has no HALO identity available. See https://docs.dxos.org/guide/halo');
    }
    await this.serviceContext.initialized.wait();
    const space = await this.serviceContext.dataSpaceManager!.createSpace();
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
    return todo();
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
