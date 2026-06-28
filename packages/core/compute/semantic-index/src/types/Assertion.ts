//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Subject/object is either a reference to an Entity or a literal value. */
export const Term = Schema.Union(
  Schema.Struct({ entity: Schema.String }),
  Schema.Struct({ literal: Schema.String }),
);
export type Term = Schema.Schema.Type<typeof Term>;

export const Assertion = Schema.Struct({
  subject: Term,
  predicate: Schema.String,
  object: Term,
  /** ISO date when the asserted state holds. */
  validFrom: Schema.optional(Schema.String),
  validTo: Schema.optional(Schema.String),
  /** Source span text. */
  quote: Schema.optional(Schema.String),
});
export interface Assertion extends Schema.Schema.Type<typeof Assertion> {}
