//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** FactBank factuality values: (CT|PR|PS) × (+|-) plus CTu (polarity unknown) and Uu (uncommitted). */
export const FactualityValue = Schema.Literal('CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu');
export type FactualityValue = Schema.Schema.Type<typeof FactualityValue>;

/**
 * The author's epistemic assessment of a proposition (FactBank "factuality"): the committed
 * factuality value, its polarity, the extractor's confidence, and the nature of the uncertainty.
 */
export const Factuality = Schema.Struct({
  value: FactualityValue,
  polarity: Schema.Literal('+', '-', '?'),
  /** Model confidence 0..1. */
  confidence: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
});
export interface Factuality extends Schema.Schema.Type<typeof Factuality> {}
