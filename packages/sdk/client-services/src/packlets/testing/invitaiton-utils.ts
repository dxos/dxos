//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationsHandler } from '../invitations';

export const performInvitation = async <T>(host: InvitationsHandler<T>, guest: InvitationsHandler<T>, context: T) => {
  const done1 = new Trigger<Invitation>(); // peer 1 connected.
  const done2 = new Trigger<Invitation>(); // peer 2 connected.
  const observable1 = await host.createInvitation(context, { type: Invitation.Type.INTERACTIVE_TESTING });
  observable1.subscribe({
    onConnecting: async (invitation1: Invitation) => {
      const observable2 = await guest.acceptInvitation(invitation1, { type: Invitation.Type.INTERACTIVE_TESTING });
      observable2.subscribe({
        onConnecting: async (invitation2: Invitation) => {
          assert(invitation1.swarmKey!.equals(invitation2.swarmKey!));
        },
        onConnected: async (invitation2: Invitation) => {},
        onSuccess: (invitation) => {
          done2.wake(invitation);
        },
        onCancelled: () => raise(new Error()),
        onTimeout: (err: Error) => raise(err),
        onError: (err: Error) => raise(err)
      });
    },
    onConnected: async (invitation1: Invitation) => {},
    onCancelled: () => raise(new Error('cancelled')),
    onSuccess: (invitation) => {
      done1.wake(invitation);
    },
    onTimeout: (err: Error) => raise(err),
    onError: (err: Error) => raise(err)
  });

  await done1.wait();
  await done2.wait();
};
