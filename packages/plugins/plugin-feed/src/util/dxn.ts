//
// Copyright 2026 DXOS.org
//

/**
 * Extracts the bare ECHO object id from a DXN. Robust to DXN form differences
 * — `dxn:echo:@:<id>` (local), `dxn:echo:<spaceId>:<id>` (space-scoped),
 * `dxn:queue:<...>:<id>` (queue-scoped) — by always taking the last part.
 */
export const dxnToObjectId = (dxn: { parts: readonly any[] }): string => String(dxn.parts[dxn.parts.length - 1]);
