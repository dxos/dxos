//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Schedule from 'effect/Schedule';

import * as Chat from '@dxos/assistant/Chat';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';

/** The progress key an agent's work on an object is reported under, which the object's navtree row reads. */
export const agentProgressKey = (object: Obj.Unknown): string =>
  `${Obj.getURI(object, { prefer: 'absolute' }).toString()}#agent`;

/** Well inside the progress sink's 90 s stall timeout, which fails a meter that stops hearing from its run. */
const HEARTBEAT = Duration.seconds(30);

/**
 * Reports a turn as status updates on its chat and, for a companion chat, on the object it accompanies: running
 * while the turn runs, then ended with its outcome. Any runtime's trace reaches the progress registry, so the turn
 * shows wherever it runs.
 */
export const withTurnStatus =
  (chat: Chat.Chat) =>
  <A, E, R>(turn: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Trace.TraceService> =>
    Effect.gen(function* () {
      const subject = Chat.getCompanionSubject(chat);
      const targets = [
        { key: agentProgressKey(chat), label: 'Assistant is working' },
        ...(subject ? [{ key: agentProgressKey(subject), label: 'Assistant is working on this' }] : []),
      ];
      const report = (end?: string) =>
        Effect.forEach(
          targets,
          ({ key, label }) => Trace.write(Trace.StatusUpdate, { message: end ?? label, progress: { key } }),
          { discard: true },
        );

      yield* report();
      const heartbeat = yield* report().pipe(
        Effect.repeat(Schedule.spaced(HEARTBEAT)),
        Effect.delay(HEARTBEAT),
        Effect.forkChild,
      );
      return yield* turn.pipe(
        Effect.onExit((exit) =>
          Fiber.interrupt(heartbeat).pipe(
            Effect.andThen(
              report(
                Exit.isSuccess(exit)
                  ? Trace.StatusComplete
                  : Exit.hasInterrupts(exit)
                    ? Trace.StatusCancelled
                    : Trace.StatusFailed,
              ),
            ),
          ),
        ),
      );
    });
