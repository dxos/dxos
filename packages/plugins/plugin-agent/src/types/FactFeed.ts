//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Feed, Filter, Obj, Type } from '@dxos/echo';
import { RDF } from '@dxos/pipeline-rdf';

/**
 * One extracted fact, as an item of a fact feed. The fact is nested rather than spread: its own `id` is the
 * statement's IRI-derived id, which must not take the place of the ECHO object id.
 */
export class FactItem extends Type.makeObject<FactItem>(DXN.make('org.dxos.type.agent.fact', '0.1.0'))(
  Schema.Struct({ fact: RDF.Fact }),
) {}

/**
 * The span of a source an extraction pass read: every message id in `[first, last]` of `source` was given to
 * the extractor. Ids compare as unsigned integers (Discord snowflakes), so a span is a time range too.
 */
export const Coverage = Schema.Struct({
  /** The source the ids belong to, e.g. a Discord channel URL. */
  source: Schema.String,
  first: Schema.String,
  last: Schema.String,
});
export interface Coverage extends Schema.Schema.Type<typeof Coverage> {}

/**
 * Closes one extraction pass in a fact feed: which extractor ran and what it covered. Travels with the facts in
 * a feed export, so a deployment that imports the feed knows what it need not extract again.
 */
export class ExtractionPass extends Type.makeObject<ExtractionPass>(
  DXN.make('org.dxos.type.agent.extractionPass', '0.1.0'),
)(
  Schema.Struct({
    /** The pass id the facts of this pass carry in `RDF.Fact.pass`. */
    pass: Schema.String,
    /** Extractor id, model and version: a pass by a different extractor covers nothing for this one. */
    extractor: Schema.String,
    coverage: Schema.Array(Coverage),
    facts: Schema.Number,
  }),
) {}

/** The key a pass is recorded under; an extractor change (model, version) makes earlier coverage stale. */
export const extractorKey = ({ id, model, version }: RDF.Fact['extractor']): string => `${id}@${version}:${model}`;

/** Whether `id` lies in a span of `source` covered for `extractor`. */
export const isCovered = (
  passes: readonly ExtractionPass[],
  extractor: string,
  source: string,
  id: string,
): boolean => {
  const value = BigInt(id);
  return passes.some(
    (pass) =>
      pass.extractor === extractor &&
      pass.coverage.some((span) => span.source === source && BigInt(span.first) <= value && value <= BigInt(span.last)),
  );
};

/** The passes recorded in a fact feed. */
export const loadPasses = (feed: Feed.Feed) => Feed.query(feed, Filter.type(ExtractionPass)).run;

/** A fact as a fact feed item. */
export const makeItem = (fact: RDF.Fact): FactItem => Obj.make(FactItem, { fact });
