//
// Copyright 2026 DXOS.org
//

/**
 * Primitive fields carried on an error's `context`, flattened for a telemetry sink.
 *
 * `@dxos/log` already merges `error.context` into a log entry, so a downloaded log and the reset
 * dialog's copy payload get these for free; only PostHog needs them lifted to the top level,
 * because its processor forwards `string | boolean | number` and only from the entry's own
 * context. Reading generically is what lets one capture carry whichever subsystem failed.
 */
export const errorContextPrimitives = (error: unknown): Record<string, string | number | boolean> => {
  if (!(error instanceof Error) || !('context' in error) || typeof error.context !== 'object' || !error.context) {
    return {};
  }
  const { context } = error;

  return Object.fromEntries(
    Object.entries(context).filter(
      (entry): entry is [string, string | number | boolean] =>
        typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
    ),
  );
};
