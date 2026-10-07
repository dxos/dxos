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
export class FactEntry extends Type.makeObject<FactEntry>(DXN.make('org.dxos.type.agent.factEntry', '0.2.0'))(
  Schema.Struct({
    source: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ title: 'Source', description: 'The object read; absent for a web page.' }),
    ),
    url: Schema.optional(Schema.String.annotate({ title: 'URL', description: 'The web page read.' })),
    name: Schema.optional(Schema.String.annotate({ title: 'Name', description: "The source's display name." })),
    recordedAt: Format.DateTime.annotate({ title: 'Recorded' }),
    through: Schema.optional(
      Schema.String.annotate({
        title: 'Read through',
        description: 'The URI of the last chat message read; the next read of the chat starts after it.',
      }),
    ),
    extractor: Extractor,
    facts: Schema.Array(RDF.Fact),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'violet' }),
  ),
) {}

/** The text of a fact's subject or object. */
export const termText = (term: RDF.Term): string =>
  term.kind === 'entity' ? (term.label ?? term.entity) : term.literal;

/** A fact as one line: subject, predicate, object. */
export const factText = (fact: RDF.Fact): string =>
  `${termText(fact.assertion.subject)} ${fact.assertion.predicate} ${termText(fact.assertion.object)}`;
