//
// Copyright 2026 DXOS.org
//

/** Marks the line of stdout that carries the results, among whatever the process logs. */
export const RESULT = 'RESULT ';

export type OtherProcessCommand =
  | { op: 'add'; names: string[] }
  | { op: 'edit'; id: string; name: string }
  | { op: 'read'; id: string };
