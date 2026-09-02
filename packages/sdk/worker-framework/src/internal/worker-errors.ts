//
// Copyright 2026 DXOS.org
//

/** Which worker an `ErrorEvent` came from, for the synthesized message. */
export type WorkerKind = 'dedicated' | 'coordinator';

/**
 * Coerces a worker `ErrorEvent` into a real `Error`.
 *
 * A worker whose script fails to fetch, fails to parse, or is blocked by policy fires an
 * `ErrorEvent` whose `error` is null and whose `message` is the opaque "Script error.", so
 * forwarding `event.error` unchanged yields a nullish failure that every telemetry sink drops
 * (the PostHog log processor forwards an entry only when it carries an actual `Error`). That
 * turns the likeliest worker failure of all into no report at all, which is how a startup that
 * never got a worker reaches error tracking as a bare 30s timeout.
 *
 * The wording stays neutral because `onerror` fires for the worker's whole lifetime: a runtime
 * fault in an opaque script produces the same null `error` as a failed load, and naming one of
 * them would put a guess into the telemetry this exists to make trustworthy.
 *
 * Takes the fields rather than the event itself so the coercion is testable without a DOM
 * `ErrorEvent` constructor, which the node test environment does not provide.
 */
export const workerErrorFromEvent = (
  event: Pick<ErrorEvent, 'error' | 'message' | 'filename' | 'lineno' | 'colno'>,
  kind: WorkerKind,
): Error => {
  if (event.error instanceof Error) {
    return event.error;
  }

  const location = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
  const error = new Error(`${kind} worker error: ${event.message || 'unknown error'}${location}`);
  // A worker that throws a non-Error (`throw 'boom'`) populates `error` with that value; dropping
  // it would lose the only description of the fault this event carries.
  if (event.error != null) {
    error.cause = event.error;
  }
  return error;
};
