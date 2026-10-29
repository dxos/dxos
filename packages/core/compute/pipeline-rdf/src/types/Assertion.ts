//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EntityKind } from './Entity.ts';

/**
 * A reference to an entity: `entity` is its key, `label` the surface form. The key is an absolute IRI where one is
 * known (`echo://...`, `did:...`, `mailto:...`, a URL), which is the same entity in every graph; otherwise it is a
 * normalized slug, stored as an IRI local to the graph that mentions it (`Vocab.localEntityIri`).
 */
export const EntityTerm = Schema.Struct({
  kind: Schema.Literal('entity'),
  entity: Schema.String,
  label: Schema.optional(Schema.String),
  /** What sort of thing the extractor took it for; stored as the entity's `rdf:type` in its graph. */
  type: Schema.optional(EntityKind),
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
 * normalized slug (the join key - `DXOS` and `dxos` collapse to `dxos`); `label` keeps the original
 * surface form for display so casing/acronyms survive (`DXOS`, not `Dxos`). Tagged by `kind` because
 * ECHO stores only unions whose members share a single literal discriminator.
 */
export const Term = Schema.Union([EntityTerm, LiteralTerm]);
export type Term = Schema.Schema.Type<typeof Term>;

/** The value a term contributes as a join key: the entity slug, else the literal. */
export const termValue = (term: Term): string => (term.kind === 'entity' ? term.entity : term.literal);

export const Assertion = Schema.Struct({
  subject: Term,
  /** The predicate's label: the surface form, or the ontology's label once stored. */
  predicate: Schema.String,
  /** The predicate's IRI; resolved from `predicate` through the ontology when absent. */
  predicateIri: Schema.optional(Schema.String),
  /**
   * What a predicate the ontology does not define means, as the extractor that minted it defined it; stored as its
   * `rdfs:comment` in the ontology graph, not in the statement's graph.
   */
  predicateDescription: Schema.optional(Schema.String),
  object: Term,
  /** ISO date when the asserted state holds. */
  validFrom: Schema.optional(Schema.String),
  validTo: Schema.optional(Schema.String),
  /** Source span text. */
  quote: Schema.optional(Schema.String),
});
export interface Assertion extends Schema.Schema.Type<typeof Assertion> {}
