//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { AuthenticatingInvitationObservable, CancellableInvitationObservable, Invitation } from '@dxos/client';

export const hostInvitation = async (
  observable: CancellableInvitationObservable,
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Promise<void>;
    onSuccess?: (invitation: Invitation) => Promise<void>;
  },
): Promise<Invitation> => {
  const done = new Trigger<Invitation>();

  observable.subscribe(
    async (invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTING: {
          await callbacks?.onConnecting?.(invitation);
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
      throw err;
    },
  );

  return done.wait();
};

export const acceptInvitation = async (
  observable: AuthenticatingInvitationObservable,
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Promise<void>;
    onReadyForAuth?: (invitation: Invitation) => Promise<string | void>;
    onSuccess?: (invitation: Invitation) => Promise<void>;
  },
): Promise<Invitation> => {
  const done = new Trigger<Invitation>();
  observable.subscribe(
    async (invitation) => {
      switch (invitation.state) {
        case Invitation.State.CONNECTING: {
          await callbacks?.onConnecting?.(invitation);
          break;
        }

        case Invitation.State.READY_FOR_AUTHENTICATION: {
          if (invitation.authMethod === Invitation.AuthMethod.SHARED_SECRET) {
            const code = invitation.authCode ?? (await callbacks?.onReadyForAuth?.(invitation));
            assert(code, 'No code provided');
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
      throw err;
    },
  );
  return done.wait();
};
