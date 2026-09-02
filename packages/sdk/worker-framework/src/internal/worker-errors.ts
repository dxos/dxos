//
// Copyright 2026 DXOS.org
//

import { WorkerError } from '../errors';

/** Which worker an `ErrorEvent` came from, for the synthesized message. */
export type WorkerKind = 'dedicated' | 'coordinator';

/**
 * Coerces a worker `ErrorEvent` into a real `Error`.
 *
 * A worker whose script fails to fetch, parse, or pass policy fires an `ErrorEvent` whose
 * `error` is null and whose `message` is the opaque "Script error.".
 */
export const workerErrorFromEvent = (
  event: Pick<ErrorEvent, 'error' | 'message' | 'filename' | 'lineno' | 'colno'>,
  kind: WorkerKind,
): Error => {
  if (event.error instanceof Error) {
    return event.error;
  }

  const location = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
  // A worker that throws a non-Error (`throw 'boom'`) populates `error` with that value.
  return new WorkerError({
    message: `${kind} worker error: ${event.message || 'unknown error'}${location}`,
    cause: event.error ?? undefined,
  });
};
