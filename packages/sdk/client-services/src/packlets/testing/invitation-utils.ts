//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { ServiceContext } from '../services';

export const performInvitation = async (
  host: ServiceContext,
  guest: ServiceContext,
  options: Parameters<ServiceContext['getInvitationHandler']>[0]
) => {
  const done1 = new Trigger<Invitation>(); // peer 1 connected.
  const done2 = new Trigger<Invitation>(); // peer 2 connected.

  const hostHandler = host.getInvitationHandler(options);
  const observable1 = await host.invitations.createInvitation(hostHandler, { authMethod: Invitation.AuthMethod.NONE });
  observable1.subscribe(
    async (invitation1: Invitation) => {
      switch (invitation1.state) {
        case Invitation.State.CONNECTING: {
          const guestHandler = guest.getInvitationHandler({ kind: options.kind });
          const observable2 = await guest.invitations.acceptInvitation(guestHandler, {
            ...invitation1,
            spaceKey: undefined
          });
          observable2.subscribe(
            (invitation2: Invitation) => {
              switch (invitation2.state) {
                case Invitation.State.CONNECTING: {
                  assert(invitation1.swarmKey!.equals(invitation2.swarmKey!));
                  break;
                }

                case Invitation.State.SUCCESS: {
                  done2.wake(invitation2);
                  break;
                }
              }
            },
            (error) => {
              raise(error);
            }
          );
          break;
        }

        case Invitation.State.SUCCESS: {
          done1.wake(invitation1);
          break;
        }
      }
    },
    (error) => {
      raise(error);
    }
  );

  await done1.wait();
  await done2.wait();
};
