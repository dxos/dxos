//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Rdf from './Rdf.ts';
import * as Trig from './Trig.ts';
import * as Vocab from './Vocab.ts';

/** One source a pipeline read (a Discord channel or thread): how far it read and what it found there. */
export const Source = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  /** Where reading stopped, as the source names its items (a Discord message id). */
  cursor: Schema.optional(Schema.String),
  firstItemAt: Schema.optional(Schema.String),
  lastItemAt: Schema.optional(Schema.String),
  items: Schema.Number,
  status: Schema.optional(Schema.String),
});
export type Source = Schema.Schema.Type<typeof Source>;

/** What one stage spent on one model. */
export const ModelUsage = Schema.Struct({
  model: Schema.String,
  calls: Schema.Number,
  inputTokens: Schema.Number,
  outputTokens: Schema.Number,
  cacheReadTokens: Schema.Number,
  cacheWriteTokens: Schema.Number,
  /** At catalog prices; absent for a model the catalog does not price. */
  costUsd: Schema.optional(Schema.Number),
});
export type ModelUsage = Schema.Schema.Type<typeof ModelUsage>;

export const Stage = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  /** Position in the pipeline, from 0. */
  order: Schema.Number,
  /** Items the stage passed to the next one. */
  items: Schema.optional(Schema.Number),
  startedAt: Schema.optional(Schema.String),
  endedAt: Schema.optional(Schema.String),
  models: Schema.Array(ModelUsage),
});
export type Stage = Schema.Schema.Type<typeof Stage>;

/**
 * What a fact-producing run did, kept in the fact store beside the facts it produced: the sources it read and how
 * far, its stages in order, the models each called and at what cost, how long it took and how many facts it wrote.
 */
export const State = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
  startedAt: Schema.optional(Schema.String),
  endedAt: Schema.optional(Schema.String),
  sources: Schema.Array(Source),
  stages: Schema.Array(Stage),
  facts: Schema.optional(Schema.Number),
});
export type State = Schema.Schema.Type<typeof State>;

/** The named graph a run's state lives in, outside every fact's graph. */
export const GRAPH = `${Vocab.GRAPH}pipeline`;

/** The predicate carrying the state, as one JSON literal: it is read whole, never queried field by field. */
export const STATE = `${Vocab.SX}pipelineState`;

const JSON_DATATYPE = `${Vocab.RDF}JSON`;

/** The quad storing `state`; importing it into a store replaces nothing, so a store holds one state per run name. */
export const toQuads = (state: State): Rdf.Quad[] => [
  Rdf.quad(
    Rdf.namedNode(`${GRAPH}/${encodeURIComponent(state.name)}`),
    Rdf.namedNode(STATE),
    Rdf.literal(JSON.stringify(state), Rdf.namedNode(JSON_DATATYPE)),
    Rdf.namedNode(GRAPH),
  ),
];

/** `state` as a TriG document, which a store imports beside the facts the run wrote. */
export const toTrig = (state: State): Effect.Effect<string> => Effect.sync(() => Trig.write(toQuads(state)));

/** Selects every stored run state as `?state`. */
export const SPARQL = `SELECT ?state WHERE { GRAPH <${GRAPH}> { ?run <${STATE}> ?state } }`;

const decode = Schema.decodeUnknownOption(Schema.fromJsonString(State));

/** The run states among `values` (each a `?state` literal from {@link SPARQL}); a malformed one is skipped. */
export const fromValues = (values: readonly string[]): State[] =>
  values.flatMap((value) => Option.toArray(decode(value)));
