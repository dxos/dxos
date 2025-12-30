//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';

import { type CancellableInvitation } from '@dxos/client-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

type HostInvitationProps = {
  observable: CancellableInvitation;
  callbacks?: {
    onConnecting?: (invitation: Invitation) => Effect.Effect<void>;
    onSuccess?: (invitation: Invitation) => Effect.Effect<void>;
  };
  peersNumber?: number;
  waitForSuccess?: boolean;
};

/**
 * Host an invitation and wait for peer connection.
 * Ported from cli-base to Effect-based approach.
 */
export const hostInvitation = ({
  observable,
  callbacks,
  peersNumber = 1,
  waitForSuccess = true,
}: HostInvitationProps): Effect.Effect<Invitation, Error> =>
  Effect.gen(function* () {
    const invitationQueue = yield* Queue.unbounded<Invitation>();
    const connectingQueue = yield* Queue.unbounded<Invitation>();
    const errorQueue = yield* Queue.unbounded<Error>();

    const runCallback = (effect: Effect.Effect<void> | undefined) => {
      if (effect) {
        runAndForwardErrors(effect).catch(() => {
          // Ignore callback errors
        });
      }
    };

    const subscription = observable.subscribe(
      (invitation: Invitation) => {
        switch (invitation.state) {
          case Invitation.State.CONNECTING: {
            runCallback(callbacks?.onConnecting?.(invitation));
            runAndForwardErrors(Queue.offer(connectingQueue, invitation)).catch(() => {});
            break;
          }

          case Invitation.State.SUCCESS: {
            runCallback(callbacks?.onSuccess?.(invitation));
            runAndForwardErrors(Queue.offer(invitationQueue, invitation)).catch(() => {});
            break;
          }
        }
      },
      (err: unknown) => {
        // Forward error to Effect chain via error queue
        const error = err instanceof Error ? err : new Error(String(err));
        runAndForwardErrors(Queue.offer(errorQueue, error)).catch(() => {
          // Error queue full or other issue - log but continue
        });
      },
    );

    // Race between getting invitation and error
    const result = yield* Effect.race(
      Effect.gen(function* () {
        let invitation: Invitation;
        if (waitForSuccess) {
          // Wait for the required number of peers
          const invitations: Invitation[] = [];
          for (let i = 0; i < peersNumber; i++) {
            const inv = yield* Queue.take(invitationQueue);
            invitations.push(inv);
          }
          invitation = invitations[invitations.length - 1];
        } else {
          invitation = yield* Queue.take(connectingQueue);
        }
        subscription.unsubscribe();
        return invitation;
      }),
      Effect.gen(function* () {
        const error = yield* Queue.take(errorQueue);
        subscription.unsubscribe();
        return yield* Effect.fail(error);
      }),
    );

    return result;
  });
