//
// Copyright 2026 DXOS.org
//

import { type Fact } from '../types';

/** Terminal unit for the cursored fact pipeline: extracted facts plus the keys the sink needs to dedup and advance the cursor. */
export type FactUnit = {
  readonly facts: Fact[];
  /** Stable per-source id (e.g. `messageSource`); the dedup foreign id. */
  readonly foreignId: string;
  /** Monotonic cursor key. */
  readonly key: number;
};
