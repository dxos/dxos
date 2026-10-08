//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** A reference to an entity: `entity` is the normalized slug, `label` the surface form. */
export const EntityTerm = Schema.Struct({
  kind: Schema.Literal('entity'),
  entity: Schema.String,
  label: Schema.optional(Schema.String),
});
export interface EntityTerm extends Schema.Schema.Type<typeof EntityTerm> {}

/** A literal value. */
export const LiteralTerm = Schema.Struct({
  kind: Schema.Literal('literal'),
  literal: Schema.String,
});
export interface LiteralTerm extends Schema.Schema.Type<typeof LiteralTerm> {}

/**
 * Subject/object is either a reference to an Entity or a literal value. The entity `id` is the
 * normalized slug (the join key — `DXOS` and `dxos` collapse to `dxos`); `label` keeps the original
 * surface form for display so casing/acronyms survive (`DXOS`, not `Dxos`). Tagged by `kind` because
 * ECHO stores only unions whose members share a single literal discriminator.
 */
export const Term = Schema.Union([EntityTerm, LiteralTerm]);
export type Term = Schema.Schema.Type<typeof Term>;

/** The value a term contributes as a join key: the entity slug, else the literal. */
export const termValue = (term: Term): string => (term.kind === 'entity' ? term.entity : term.literal);

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
