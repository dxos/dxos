//
// Copyright 2026 DXOS.org
//

/**
 * Reads an error's structured `context`, which {@link BaseError} declares and a plain `Error` may
 * still carry: a failure raised outside DXOS travels the same log and telemetry paths.
 */
const readContext = (error: Error): object =>
  'context' in error && typeof error.context === 'object' && error.context ? error.context : {};

/**
 * Merges structured detail into an error's `context`, returning the same error.
 *
 * Both of the repo's error codecs carry this field, so a failure annotated here reaches the
 * downloadable log (`computeContext` in `@dxos/log`) and the reset dialog's copy payload without
 * either of them knowing which subsystem produced it.
 */
export const withContext = <T>(error: T, context: Record<string, unknown>): T => {
  if (error instanceof Error) {
    Object.assign(error, { context: { ...readContext(error), ...context } });
  }
  return error;
};

/**
 * Flattens the primitive fields of an error's `context` for a telemetry sink.
 *
 * Sinks that forward only top-level `string | number | boolean` from a log entry's own context
 * (the PostHog processor) need these lifted. Nested values are dropped rather than stringified, so
 * a caller cannot silently widen what leaves the device.
 */
export const errorContextPrimitives = (error: unknown): Record<string, string | number | boolean> => {
  if (!(error instanceof Error)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(readContext(error)).filter(
      (entry): entry is [string, string | number | boolean] =>
        typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
    ),
  );
};
