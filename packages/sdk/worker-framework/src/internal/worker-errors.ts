//
// Copyright 2026 DXOS.org
//

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
 * Takes the fields rather than the event itself so the coercion is testable without a DOM
 * `ErrorEvent` constructor, which the node test environment does not provide.
 */
export const workerErrorFromEvent = (
  event: Pick<ErrorEvent, 'error' | 'message' | 'filename' | 'lineno' | 'colno'>,
  worker: string,
): Error => {
  if (event.error instanceof Error) {
    return event.error;
  }

  const location = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
  return new Error(`${worker} worker failed to load: ${event.message || 'unknown error'}${location}`);
};
