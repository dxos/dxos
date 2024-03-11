//
// Copyright 2023 DXOS.org
//

import { Trigger, Event } from '@dxos/async';
import {
  type AuthenticatingInvitationObservable,
  type CancellableInvitationObservable,
  Invitation,
} from '@dxos/client/invitations';
import { invariant } from '@dxos/invariant';
import { AlreadyJoinedError } from '@dxos/protocols';

export const hostInvitation = async ({
  observable,
  callbacks,
  peersNumber = 1,
  waitForSuccess = true,
}: {
  observable: CancellableInvitationObservable;
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Promise<void>;
    onSuccess?: (invitation: Invitation) => Promise<void>;
  };
  peersNumber?: number;
  waitForSuccess?: boolean;
}): Promise<Invitation> => {
  const invitationEvent = new Event<Invitation>();
  const connectingEvent = new Event<Invitation>();

  const done = invitationEvent.waitForCount(peersNumber);
  const unsubscribeHandle = observable.subscribe(
    async (invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTING: {
          await callbacks?.onConnecting?.(invitation);
          connectingEvent.emit(invitation);
          break;
        }

        case Invitation.State.SUCCESS: {
          await callbacks?.onSuccess?.(invitation);
          invitationEvent.emit(invitation);
          break;
        }
      }
    },
    (err) => {
      throw err;
    },
  );

  let invitation: Invitation;
  if (waitForSuccess) {
    invitation = await done;
  } else {
    invitation = await connectingEvent.waitForCount(1);
  }
  unsubscribeHandle.unsubscribe();
  return invitation;
};

export const acceptInvitation = async ({
  observable,
  callbacks,
}: {
  observable: AuthenticatingInvitationObservable;
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Promise<void>;
    onReadyForAuth?: (invitation: Invitation) => Promise<string | void>;
    onSuccess?: (invitation: Invitation) => Promise<void>;
  };
}): Promise<Invitation> => {
  const done = new Trigger<Invitation>();
  const unsubscribeHandle = observable.subscribe(
    async (invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTING: {
          await callbacks?.onConnecting?.(invitation);
          break;
        }

        case Invitation.State.READY_FOR_AUTHENTICATION: {
          if (invitation.authMethod === Invitation.AuthMethod.SHARED_SECRET) {
            const callbackResult = await callbacks?.onReadyForAuth?.(invitation);
            const code = invitation.authCode ?? callbackResult;
            invariant(code, 'No code provided');
            await observable.authenticate(code);
          }
          break;
        }

        case Invitation.State.SUCCESS: {
          await callbacks?.onSuccess?.(invitation);
          done.wake(invitation);
          break;
        }
      }
    },
    (err) => {
      if (err instanceof AlreadyJoinedError) {
        done.wake(observable.get());
        return;
      }

      throw err;
    },
  );

  const invitation = await done.wait();
  unsubscribeHandle.unsubscribe();
  return invitation;
};
