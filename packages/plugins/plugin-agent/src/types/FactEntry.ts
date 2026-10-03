//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import * as RDF from '@dxos/pipeline-rdf/types';

/**
 * `Obj.Meta` key source (and `Feed.kind`) of an agent's annotation feed for one source; the key's id
 * is the source object's id, or the URL when the source is a web page.
 */
export const ANNOTATIONS_KEY = 'org.dxos.agent.annotations';

/**
 * pipeline-rdf's `Term` as one struct: ECHO only stores discriminated unions, and an entity term and a
 * literal term share no tag field.
 */
export const Term = Schema.Struct({
  entity: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
  literal: Schema.optional(Schema.String),
});

export interface Term extends Schema.Schema.Type<typeof Term> {}

/** pipeline-rdf's `Fact`, with its subject and object stored as {@link Term}; an `RDF.Fact` is assignable to it. */
export const Fact = Schema.Struct({
  ...RDF.Fact.fields,
  assertion: Schema.Struct({ ...RDF.Assertion.fields, subject: Term, object: Term }),
});

export interface Fact extends Schema.Schema.Type<typeof Fact> {}

/** Who extracted an entry's facts. */
export const Extractor = Schema.Struct({
  id: Schema.String,
  model: Schema.String,
  version: Schema.String,
});

export interface Extractor extends Schema.Schema.Type<typeof Extractor> {}

/**
 * One extraction pass over a source (document, web page or chat transcript), appended to that
 * source's annotation feed. Facts are feed items rather than objects: an agent records hundreds a day
 * (docs/ONTOLOGY.md §2).
 */
export class FactEntry extends Type.makeObject<FactEntry>(DXN.make('org.dxos.type.agent.factEntry', '0.1.0'))(
  Schema.Struct({
    source: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ title: 'Source', description: 'The object read; absent for a web page.' }),
    ),
    url: Schema.optional(Schema.String.annotate({ title: 'URL', description: 'The web page read.' })),
    name: Schema.optional(Schema.String.annotate({ title: 'Name', description: "The source's display name." })),
    recordedAt: Format.DateTime.annotate({ title: 'Recorded' }),
    extractor: Extractor,
    facts: Schema.Array(Fact),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'violet' }),
  ),
) {}

/** The text of a fact's subject or object. */
export const termText = (term: Term): string => term.label ?? term.entity ?? term.literal ?? '';

/** A fact as one line: subject, predicate, object. */
export const factText = (fact: Fact): string =>
  `${termText(fact.assertion.subject)} ${fact.assertion.predicate} ${termText(fact.assertion.object)}`;
