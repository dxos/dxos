//
// Copyright 2026 DXOS.org
//

import expected from './expected.json' with { type: 'json' };

/** Oxigraph answer for one query: row count and `checksumRows` digest. */
export type OracleAnswer = { rows: number; checksum: string };

/** Oracle answers keyed by dataset (`facts:<n>`, `code:<n>`, `probes`) then query id. */
export const ORACLE: Record<string, Record<string, OracleAnswer>> = expected;
