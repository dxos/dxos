//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as FiberMap from 'effect/FiberMap';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { log } from '@dxos/log';
import { type EventAttributes, type RemoteEvents, TRACE_PROCESSOR } from '@dxos/tracing';

import type * as Observability from '../Observability.ts';
import type * as ObservabilityExtension from '../ObservabilityExtension.ts';

/** The product event a user creating an object stands for. */
export const OBJECT_CREATED_EVENT = 'space.object.add';

/**
 * How long a new object must survive before it counts as created: the create dialog adds a draft when it
 * opens and removes it if the user cancels.
 */
export const DRAFT_WINDOW = Duration.seconds(30);

type TraceEvent = { name: string; attributes: EventAttributes };

/**
 * Reports ECHO's `echo.object.add` trace events as {@link OBJECT_CREATED_EVENT}, for user-facing types
 * only and not for objects an integration created. Events arrive only while registered; ECHO does not
 * replay them.
 */
export const listen = (
  events: RemoteEvents,
  capture: ObservabilityExtension.Events['captureEvent'],
  draftWindow: Duration.Input = DRAFT_WINDOW,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const queue = yield* Queue.unbounded<TraceEvent>();
    const processor = {
      emit: (name: string, attributes: EventAttributes) => Queue.offerUnsafe(queue, { name, attributes }),
    };
    yield* Effect.acquireRelease(
      Effect.sync(() => events.registerProcessor(processor)),
      () => Effect.sync(() => events.unregisterProcessor(processor)),
    );

    // Keyed by object id so removing a draft interrupts its pending report.
    const pending = yield* FiberMap.make<string>();
    yield* Stream.fromQueue(queue).pipe(
      Stream.runForEach(({ name, attributes }) =>
        Effect.gen(function* () {
          const objectId = attributes.objectId;
          if (typeof objectId !== 'string') {
            return;
          }

          if (name === 'echo.object.remove') {
            yield* FiberMap.remove(pending, objectId);
            return;
          }

          if (name !== 'echo.object.add' || attributes.userType !== true || attributes.external === true) {
            return;
          }

          const { spaceId, typename } = attributes;
          yield* FiberMap.run(
            pending,
            objectId,
            Effect.sleep(draftWindow).pipe(
              Effect.andThen(Effect.try(() => capture(OBJECT_CREATED_EVENT, { spaceId, objectId, typename }))),
              Effect.catch((error) => Effect.sync(() => log.catch(error))),
            ),
          );
        }),
      ),
      Effect.forkScoped,
    );
  });

/**
 * Sends {@link OBJECT_CREATED_EVENT} for every object a user creates in this realm, however it was
 * created: from a dialog, an agent tool call, or a raw `db.add` in a view.
 */
export const provider: Observability.DataProvider = Effect.fn(function* (observability) {
  const scope = yield* Scope.make();
  yield* listen(TRACE_PROCESSOR.remoteEvents, (event, attributes) =>
    observability.events.captureEvent(event, attributes),
  ).pipe(Scope.provide(scope));
  return () => {
    Effect.runFork(Scope.close(scope, Exit.void));
  };
});
