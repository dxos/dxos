//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { InvitationsHandler } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const performInvitation = async <T>(host: InvitationsHandler<T>, guest: InvitationsHandler<T>, context: T) => {
  const done1 = new Trigger<Invitation>(); // peer 1 connected.
  const done2 = new Trigger<Invitation>(); // peer 2 connected.

  const observable1 = await host.createInvitation(context, { type: Invitation.Type.INTERACTIVE_TESTING });
  observable1.subscribe(
    async (invitation1: Invitation) => {
      switch (invitation1.state) {
        case Invitation.State.CONNECTING: {
          const observable2 = await guest.acceptInvitation(invitation1, { type: Invitation.Type.INTERACTIVE_TESTING });
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
