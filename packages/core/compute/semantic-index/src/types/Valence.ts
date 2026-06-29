//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** FactBank factuality values: (CT|PR|PS) × (+|-) plus CTu (polarity unknown) and Uu (uncommitted). */
export const Factuality = Schema.Literal('CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu');
export type Factuality = Schema.Schema.Type<typeof Factuality>;

export const Valence = Schema.Struct({
  factuality: Factuality,
  polarity: Schema.Literal('+', '-', '?'),
  /** Model confidence 0..1. */
  confidence: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
});
export interface Valence extends Schema.Schema.Type<typeof Valence> {}
