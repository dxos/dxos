//
// Copyright 2026 DXOS.org
//

import { type DXN } from '@dxos/keys';

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
  /** The author as the model reads it, e.g. a display name. */
  readonly author?: string;
  /** The author's canonical id, stored as `attribution.agent`; defaults to `author` normalized. */
  readonly agent?: string;
  readonly date?: string;
};

/** Which extractor turns text into facts: the LLM alone, or System One with the LLM as its fallback. */
export type Extractor = 'llm' | 'system-one';

/** When System One keeps, drops or hands a claim to the LLM. Probabilities and confidences are in [0, 1]. */
export type SystemOneThresholds = {
  /** A claim less likely than this to state a fact is dropped as filler. */
  readonly minIsFact: number;
  /** A predicate chosen with less confidence sends the claim to the LLM. */
  readonly minPredicateConfidence: number;
  /** A mention linked with less confidence keeps its span instead of the known entity's IRI. */
  readonly minEntityConfidence: number;
  /** A claim the decision model flags as needing the LLM with more probability than this goes to it. */
  readonly maxNeedsFallback: number;
};

/** System One extraction: Clairic finds claims and their spans, a decision model picks predicates and links entities. */
export type SystemOneOptions = {
  /** Defaults to Cloudflare's Clairic. */
  readonly extractionModel?: DXN.DXN;
  /** Defaults to Cloudflare's Clef. */
  readonly decisionModel?: DXN.DXN;
  readonly thresholds?: Partial<SystemOneThresholds>;
  /** Send uncertain claims to the LLM extractor (default `true`); without it they are dropped. */
  readonly fallback?: boolean;
  /** Claims analysed at once (default 4). */
  readonly concurrency?: number;
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
   * the strict call is pure wasted latency — pass `false` for those to make each chunk a single
   * generation. Defaults to `true`.
   */
  readonly strict?: boolean;
  /**
   * The predicates the extractor is shown and reuses; a relation none of them fits mints a predicate in the
   * ontology's namespace. Defaults to the seed ontology.
   */
  readonly ontology?: Ontology.Ontology;
  /**
   * Only the ontology's predicates are used: a relation none of them fits is dropped rather than minted, so the
   * graph conforms to the seeded vocabularies.
   */
  readonly closed?: boolean;
  /** Entities the extractor is shown by name; a mention that names one is stored under its IRI. */
  readonly entities?: ReadonlyArray<KnownEntity>;
  /** Defaults to `llm`; `model` and `provider` then name System One's fallback model. */
  readonly extractor?: Extractor;
  readonly systemOne?: SystemOneOptions;
};
