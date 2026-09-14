//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Assertion } from './Assertion.ts';
import { Attribution } from './Attribution.ts';
import { Factuality } from './Factuality.ts';
import { Illocution } from './Illocution.ts';

export const Fact = Schema.Struct({
  id: Schema.String,
  assertion: Assertion,
  factuality: Factuality,
  /** The speech act the source performed. Absent ⇒ assertive (a plain notification/statement). */
  illocution: Schema.optional(Illocution),
  attribution: Attribution,
  /** ISO transaction time. */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  /** For incremental divergence detection. */
  sourceHash: Schema.String,
});
export interface Fact extends Schema.Schema.Type<typeof Fact> {}
