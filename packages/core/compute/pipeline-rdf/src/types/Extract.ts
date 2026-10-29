//
// Copyright 2026 DXOS.org
//

import { type EntityKind } from './Entity.ts';
import type * as Ontology from './Ontology.ts';

/** An entity the extractor may name: a mention of it is stored under its stable IRI rather than a graph-local one. */
export type KnownEntity = {
  /** Its stable IRI: an ECHO object URI, a member's DID, a `mailto:`. */
  readonly iri: string;
  readonly label: string;
  readonly aliases?: ReadonlyArray<string>;
  readonly type?: EntityKind;
};

/** A source document for fact extraction: the text plus provenance carried onto each fact. */
export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

/** Options controlling fact extraction (model, provider, extra rules, strict-mode). */
export type ExtractOptions = {
  /** Extra extraction rules appended after the default rule set. */
  readonly rules?: readonly string[];
  /** Model DXN to extract with. Defaults to the extraction stage's default model. */
  readonly model?: string;
  /** Provider DXN for model resolution (e.g. `Provider.ollama.id`) when the model is not served by the default provider. */
  readonly provider?: string;
  /**
   * Attempt strict `generateObject` before the lenient `generateText` + salvage path. Strong hosted
   * models honor the schema, but local providers (Ollama) reliably fail structured output there, so
   * the strict call is pure wasted latency - pass `false` for those to make each chunk a single
   * generation. Defaults to `true`.
   */
  readonly strict?: boolean;
  /**
   * The predicates the extractor is shown and reuses; a relation none of them fits mints a predicate in the
   * ontology's namespace. Defaults to the seed ontology.
   */
  readonly ontology?: Ontology.Ontology;
  /** Entities the extractor is shown by name; a mention that names one is stored under its IRI. */
  readonly entities?: ReadonlyArray<KnownEntity>;
};
