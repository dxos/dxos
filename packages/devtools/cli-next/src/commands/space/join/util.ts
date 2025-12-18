//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';

import { type AuthenticatingInvitationObservable, Invitation } from '@dxos/client/invitations';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AlreadyJoinedError } from '@dxos/protocols';

type AcceptInvitationParams = {
  observable: AuthenticatingInvitationObservable;
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Effect.Effect<void>;
    onReadyForAuth?: (invitation: Invitation) => Effect.Effect<string | void, never, never>;
    onSuccess?: (invitation: Invitation) => Effect.Effect<void>;
  };
};

/**
 * Accept an invitation and handle authentication flow.
 * Ported from cli-base to Effect-based approach.
 */
export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationParams): Effect.Effect<Invitation, Error> =>
  Effect.gen(function* () {
    const doneQueue = yield* Queue.unbounded<Invitation>();

    const runCallback = (effect: Effect.Effect<void> | undefined) => {
      if (effect) {
        runAndForwardErrors(effect).catch(() => {
          // Ignore callback errors
        });
      }
    };

    const subscription = observable.subscribe(
      (invitation) => {
        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            runCallback(callbacks?.onConnecting?.(invitation));
            break;
          }

          case Invitation.State.READY_FOR_AUTHENTICATION: {
            if (invitation.authMethod === Invitation.AuthMethod.SHARED_SECRET) {
              const callbackEffect = callbacks?.onReadyForAuth?.(invitation) ?? Effect.succeed(undefined);
              Effect.gen(function* () {
                const callbackResult = yield* callbackEffect;
                const code = invitation.authCode ?? callbackResult;
                invariant(code, 'No code provided');
                yield* Effect.tryPromise(() => observable.authenticate(code));
              })
                .pipe(runAndForwardErrors)
                .catch(() => {
                  // Error handling
                });
            }
            break;
          }

          case Invitation.State.SUCCESS: {
            runCallback(callbacks?.onSuccess?.(invitation));
            runAndForwardErrors(Queue.offer(doneQueue, invitation)).catch(() => {});
            break;
          }
        }
      },
      (err) => {
        if (err instanceof AlreadyJoinedError) {
          runAndForwardErrors(Queue.offer(doneQueue, observable.get())).catch(() => {});
          return;
        }
        throw err;
      },
    );

    const invitation = yield* Queue.take(doneQueue);
    subscription.unsubscribe();
    return invitation;
  });
