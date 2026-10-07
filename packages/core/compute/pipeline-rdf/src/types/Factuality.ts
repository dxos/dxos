//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** FactBank factuality values: (CT|PR|PS) × (+|-) plus CTu (polarity unknown) and Uu (uncommitted). */
export const FactualityValue = Schema.Literals(['CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu']);
export type FactualityValue = Schema.Schema.Type<typeof FactualityValue>;

/**
 * The author's epistemic assessment of a proposition (FactBank "factuality"): the committed
 * factuality value, its polarity, the extractor's confidence, and the nature of the uncertainty.
 */
export const Factuality = Schema.Struct({
  value: FactualityValue,
  polarity: Schema.Literals(['+', '-', '?']),
  /** Model confidence 0..1. */
  confidence: Schema.optional(Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })))),
  nature: Schema.optional(Schema.Literals(['epistemic', 'aleatory'])),
});
export interface Factuality extends Schema.Schema.Type<typeof Factuality> {}
