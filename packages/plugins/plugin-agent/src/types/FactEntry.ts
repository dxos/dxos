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

/** `Obj.Meta` key source of a {@link FactEntry}; the key's id is the fact's `id`, so a fact is found without a scan. */
export const FACT_KEY = 'org.dxos.agent.fact';

/** Who extracted a pass's facts. */
export const Extractor = Schema.Struct({
  id: Schema.String,
  model: Schema.String,
  version: Schema.String,
});

export interface Extractor extends Schema.Schema.Type<typeof Extractor> {}

/**
 * One fact read from a source, appended to that source's annotation feed. A fact is a feed item rather
 * than an object (an agent records hundreds a day, docs/ONTOLOGY.md §2), and one item per fact so it can
 * be forgotten on its own; it is wrapped because an ECHO id cannot be the fact's `source#hash#index` id.
 */
export class FactEntry extends Type.makeObject<FactEntry>(DXN.make('org.dxos.type.agent.factEntry', '0.2.0'))(
  Schema.Struct({
    fact: RDF.Fact,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'violet' })),
) {}

/**
 * Closes one extraction pass over a source: appended after the pass's facts, whose `pass` is this
 * object's id, so a fact whose marker is absent belongs to a pass that has not completed.
 */
export class ExtractionPass extends Type.makeObject<ExtractionPass>(
  DXN.make('org.dxos.type.agent.extractionPass', '0.1.0'),
)(
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
    facts: Schema.Number.annotate({ title: 'Facts', description: 'How many facts the pass appended.' }),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'violet' }),
  ),
) {}

/** The foreign key a fact's entry carries. */
export const factKey = (factId: string) => ({ source: FACT_KEY, id: factId });

/** A fact of a completed pass, with the entry that holds it and the pass that recorded it. */
export type Recorded = { entry: FactEntry; fact: RDF.Fact; pass: ExtractionPass };

/** The facts whose pass completed; facts of a pass still being appended (no marker yet) are left out. */
export const completed = (entries: readonly FactEntry[], passes: readonly ExtractionPass[]): Recorded[] => {
  const byId = new Map(passes.map((pass) => [pass.id, pass]));
  return entries.flatMap((entry) => {
    const pass = entry.fact.pass === undefined ? undefined : byId.get(entry.fact.pass);
    return pass ? [{ entry, fact: entry.fact, pass }] : [];
  });
};

/** The text of a fact's subject or object. */
export const termText = (term: RDF.Term): string =>
  term.kind === 'entity' ? (term.label ?? term.entity) : term.literal;

/** A fact as one line: subject, predicate, object. */
export const factText = (fact: RDF.Fact): string =>
  `${termText(fact.assertion.subject)} ${fact.assertion.predicate} ${termText(fact.assertion.object)}`;
