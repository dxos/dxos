//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Assertion } from './Assertion';
import { Attribution } from './Attribution';
import { Factuality } from './Factuality';

export const Fact = Schema.Struct({
  id: Schema.String,
  assertion: Assertion,
  factuality: Factuality,
  attribution: Attribution,
  /** ISO transaction time. */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  /** For incremental divergence detection. */
  sourceHash: Schema.String,
});
export interface Fact extends Schema.Schema.Type<typeof Fact> {}
