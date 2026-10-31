//
// Copyright 2026 DXOS.org
//

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
