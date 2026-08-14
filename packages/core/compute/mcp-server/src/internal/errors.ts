//
// Copyright 2026 DXOS.org
//

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? (error.message ?? String(error)) : String(error);
