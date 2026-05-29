//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { useEffect, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type InvocationSpan, InvocationOutcome } from '@dxos/functions-runtime';
import { type OperationInvoker } from '@dxos/operation';

const DEFAULT_LIMIT = 200;

const toSpan = (event: OperationInvoker.InvocationEvent, startTimestamp: number): InvocationSpan => {
  const name = event.operation.meta.name ?? event.operation.meta.key;
  switch (event.status.type) {
    case 'pending':
      return {
        id: event.invocationId,
        name,
        timestamp: event.timestamp,
        duration: 0,
        outcome: InvocationOutcome.PENDING,
        input: event.input,
      };
    case 'success':
      return {
        id: event.invocationId,
        name,
        timestamp: startTimestamp,
        duration: event.timestamp - startTimestamp,
        outcome: InvocationOutcome.SUCCESS,
        input: event.input,
      };
    case 'failure':
      return {
        id: event.invocationId,
        name,
        timestamp: startTimestamp,
        duration: event.timestamp - startTimestamp,
        outcome: InvocationOutcome.FAILURE,
        input: event.input,
        error: { name: event.status.error.name, message: event.status.error.message, stack: event.status.error.stack },
      };
  }
};

/**
 * Subscribes to the in-process operation invocation stream and folds lifecycle events into spans
 * (pending until the terminal event, then success/failure with duration). The most recent `limit`
 * invocations are retained.
 */
export const useOperationInvocationSpans = (limit = DEFAULT_LIMIT): InvocationSpan[] => {
  const invoker = useOperationInvoker();
  const [spans, setSpans] = useState<InvocationSpan[]>([]);

  useEffect(() => {
    const byId = new Map<string, InvocationSpan>();
    const fiber = Effect.runFork(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.runForEach((event) =>
          Effect.sync(() => {
            const startTimestamp = byId.get(event.invocationId)?.timestamp ?? event.timestamp;
            byId.set(event.invocationId, toSpan(event, startTimestamp));

            if (byId.size > limit) {
              const oldest = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp).slice(0, byId.size - limit);
              for (const span of oldest) {
                byId.delete(span.id);
              }
            }

            setSpans([...byId.values()]);
          }),
        ),
      ),
    );

    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [invoker, limit]);

  return spans;
};
