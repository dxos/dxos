//
// Copyright 2026 DXOS.org
//

/**
 * A load failure only names its stage (`import-failed`, `manifest-error`); the cause says what to fix
 * in the plugin, e.g. a module that threw while evaluating.
 */
export const describeLoadError = (error: unknown): string =>
  error instanceof Error && error.cause instanceof Error ? `${String(error)}: ${error.cause.message}` : String(error);
