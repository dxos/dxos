//
// Copyright 2026 DXOS.org
//

/** Stable reference date so regenerations are reproducible. Override with NOW=2026-05-20 env. */
export const REFERENCE = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-10-20T15:00:00Z');
