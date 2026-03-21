//
// Copyright 2025 DXOS.org
//

/** Extracts a human-readable message from an EdgeCallFailedError (or any Error). */
export const formatEdgeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const parts = [error.message];
  if (error.cause instanceof Error) {
    parts.push(error.cause.message);
  }

  return parts.join(' ');
};
