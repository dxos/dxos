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

/** The product events ECHO's trace events are reported as. */
export const EVENTS = {
  objectAdd: 'space.object.add',
  objectRemove: 'space.object.remove',
  relationAdd: 'space.relation.add',
  relationRemove: 'space.relation.remove',
  typeAdd: 'space.type.add',
  feedAppend: 'space.feed.append',
} as const;

/**
 * How long a new object must survive before it counts as created: the create dialog adds a draft when it
 * opens and removes it if the user cancels.
 */
export const DRAFT_WINDOW = Duration.seconds(30);

type TraceEvent = { name: string; attributes: EventAttributes };

/**
 * Reports ECHO's trace events as product events: user-facing objects and every relation added or removed, types
 * persisted, and items appended to feeds. Every write is reported with its `origin` (`user`, `system` or `unknown`),
 * so a dashboard separates people's actions from the rest. An add that is removed within the draft window
 * reports neither. Events arrive only while registered; ECHO does not replay them.
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

    const send = (event: string, properties: Record<string, unknown>) =>
      Effect.try(() => capture(event, properties)).pipe(Effect.catch((error) => Effect.sync(() => log.catch(error))));

    // Keyed by object id so removing a draft interrupts its pending report.
    const pending = yield* FiberMap.make<string>();
    yield* Stream.fromQueue(queue).pipe(
      Stream.runForEach(({ name, attributes }) =>
        Effect.gen(function* () {
          const { spaceId, objectId, typename, relation, userType, origin } = attributes;
          switch (name) {
            case 'echo.object.add': {
              if (typeof objectId !== 'string' || (relation !== true && userType !== true)) {
                return;
              }
              const event = relation === true ? EVENTS.relationAdd : EVENTS.objectAdd;
              yield* FiberMap.run(
                pending,
                objectId,
                Effect.sleep(draftWindow).pipe(Effect.andThen(send(event, { spaceId, objectId, typename, origin }))),
              );
              return;
            }

            case 'echo.object.remove': {
              if (typeof objectId !== 'string') {
                return;
              }
              if (yield* FiberMap.has(pending, objectId)) {
                yield* FiberMap.remove(pending, objectId);
                return;
              }
              if (relation === true || userType === true) {
                const event = relation === true ? EVENTS.relationRemove : EVENTS.objectRemove;
                yield* send(event, { spaceId, objectId, typename, origin });
              }
              return;
            }

            case 'echo.type.add': {
              yield* send(EVENTS.typeAdd, { spaceId, typename, version: attributes.version, origin });
              return;
            }

            case 'echo.feed.append': {
              yield* send(EVENTS.feedAppend, { spaceId, feedId: attributes.feedId, objectId, typename, origin });
              return;
            }
          }
        }),
      ),
      Effect.forkScoped,
    );
  });

/**
 * Reports what is written in this realm's spaces, however it was written: from a dialog, an agent, a sync, or a raw
 * `db.add` in a view.
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
