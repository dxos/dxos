//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Assertion } from './Assertion.ts';
import { Attribution } from './Attribution.ts';
import { Factuality } from './Factuality.ts';
import { Illocution } from './Illocution.ts';

/**
 * One statement and what is known about it. Statements that share their provenance live in one named graph
 * (`graph`), which carries that provenance once; a fact without a graph is the only statement of its own.
 */
export const Fact = Schema.Struct({
  /** The statement's id: the fact id for a graph of its own, else derived from the graph and the statement. */
  id: Schema.String,
  /** IRI of the named graph holding the statement. */
  graph: Schema.optional(Schema.String),
  assertion: Assertion,
  factuality: Factuality,
  /** The speech act the source performed. Absent => assertive (a plain notification/statement). */
  illocution: Schema.optional(Illocution),
  attribution: Attribution,
  /** ISO transaction time. */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  /** For incremental divergence detection. */
  sourceHash: Schema.String,
  /**
   * Extraction pass id, grouping the facts one run produced so they can be replayed or retracted
   * together. Top-level rather than in `extractor`, which names the program, not the run.
   */
  pass: Schema.optional(Schema.String),
  /** What sort of knowledge the graph records, e.g. a memory's `preference` or `commitment`. */
  kind: Schema.optional(Schema.String),
  /** Whether the speaker said it (`stated`) or the agent concluded it (`inferred`). */
  origin: Schema.optional(Schema.String),
  /** IRIs of the graphs this one replaces. */
  supersedes: Schema.optional(Schema.Array(Schema.String)),
  /** IRIs of the graphs this one withdraws. */
  retracts: Schema.optional(Schema.Array(Schema.String)),
});
export interface Fact extends Schema.Schema.Type<typeof Fact> {}
