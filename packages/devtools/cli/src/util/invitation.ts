//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { CancellableInvitationObservable, Invitation } from '@dxos/client';

export const hostInvitation = async (
  invitation: CancellableInvitationObservable,
  callbacks?: { onConnecting?: (invitation: Invitation) => void; onSuccess?: (invitation: Invitation) => void },
): Promise<Invitation> => {
  const done = new Trigger<Invitation>();

  invitation.subscribe(
    (invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTING: {
          callbacks?.onConnecting?.(invitation);
          break;
        }

        case Invitation.State.SUCCESS: {
          callbacks?.onSuccess?.(invitation);
          done.wake(invitation);
          break;
        }
      }
    },
    (err) => {
      throw err;
    },
  );

  return done.wait();
};

export const acceptInvitation = async (
  invitation: CancellableInvitationObservable,
  callbacks?: { onConnecting?: (invitation: Invitation) => void; onSuccess?: (invitation: Invitation) => void },
): Promise<Invitation> => {};
