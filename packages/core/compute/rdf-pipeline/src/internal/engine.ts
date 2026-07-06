//
// Copyright 2026 DXOS.org
//

import { QueryEngine } from '@comunica/query-sparql-rdfjs';

/** Annotated to avoid TS2883 (inferred QueryEngine type is not portable across packages). */
export const makeEngine = (): QueryEngine => new QueryEngine();
