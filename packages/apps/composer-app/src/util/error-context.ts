//
// Copyright 2026 DXOS.org
//

/** Primitive fields carried on an error's `context`, flattened for a telemetry sink. */
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
