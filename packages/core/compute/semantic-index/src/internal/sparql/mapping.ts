//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { DataFactory, type Literal, type NamedNode, type Quad, type Term as RdfTerm } from 'n3';

import { Fact, type Term } from '../../types';
import { ENTITY, entityIdFromIri, entityIri, factIdFromIri, factIri, prov, str, sx } from '../vocab';

const { quad, defaultGraph } = DataFactory;

const decodeFact = Schema.decodeUnknownSync(Fact);

const localName = (iri: string) => iri.replace(/^.*[#/]/, '');
const termToObject = (term: Term): NamedNode | Literal =>
  'entity' in term ? entityIri(term.entity) : str(term.literal);
const objectToTerm = (term: RdfTerm | undefined, label?: string): Term | undefined =>
  term === undefined
    ? undefined
    : term.termType === 'NamedNode' && term.value.startsWith(ENTITY)
      ? { entity: entityIdFromIri(term.value), ...(label !== undefined ? { label } : {}) }
      : { literal: term.value };

/**
 * Plain RDF reification of a Fact.
 *
 * `attribution.source` is serialized to `prov:wasDerivedFrom` (the Task 6 query-builder filters on it).
 *
 * Invariant: every serialized predicate must have a UNIQUE local name (reassembly keys annotations by local name).
 * `attribution.wasDerivedFrom` (array) uses the `sx:derivedFrom` predicate — a distinct local name from the
 * `prov:wasDerivedFrom` used for `source` — so the two never collide on reassembly.
 */

/** Expand a Fact into plain reified triples (a Fact node + annotation triples). */
export const factToTriples = (fact: Fact): Quad[] => {
  const node = factIri(fact.id);
  const g = defaultGraph();
  const triples: Quad[] = [
    quad(node, sx('subject'), termToObject(fact.assertion.subject), g),
    quad(node, sx('predicate'), str(fact.assertion.predicate), g),
    quad(node, sx('object'), termToObject(fact.assertion.object), g),
    quad(node, sx('factuality'), str(fact.valence.factuality), g),
    quad(node, sx('polarity'), str(fact.valence.polarity), g),
    quad(node, prov('wasDerivedFrom'), str(fact.attribution.source), g),
    quad(node, prov('generatedAtTime'), str(fact.attribution.generatedAtTime), g),
    quad(node, sx('recordedAt'), str(fact.recordedAt), g),
    quad(node, sx('sourceHash'), str(fact.sourceHash), g),
    quad(node, sx('extractorId'), str(fact.extractor.id), g),
    quad(node, sx('extractorModel'), str(fact.extractor.model), g),
    quad(node, sx('extractorVersion'), str(fact.extractor.version), g),
  ];
  if (fact.attribution.agent) {
    triples.push(quad(node, prov('wasAttributedTo'), entityIri(fact.attribution.agent), g));
  }
  if (fact.valence.confidence !== undefined) {
    triples.push(quad(node, sx('confidence'), str(String(fact.valence.confidence)), g));
  }
  if (fact.valence.nature) {
    triples.push(quad(node, sx('nature'), str(fact.valence.nature), g));
  }
  if (fact.assertion.validFrom) {
    triples.push(quad(node, sx('validFrom'), str(fact.assertion.validFrom), g));
  }
  if (fact.assertion.validTo) {
    triples.push(quad(node, sx('validTo'), str(fact.assertion.validTo), g));
  }
  if (fact.assertion.quote) {
    triples.push(quad(node, sx('quote'), str(fact.assertion.quote), g));
  }
  // Preserve the original surface form for display (entity ids are lowercased slugs).
  if ('entity' in fact.assertion.subject && fact.assertion.subject.label) {
    triples.push(quad(node, sx('subjectLabel'), str(fact.assertion.subject.label), g));
  }
  if ('entity' in fact.assertion.object && fact.assertion.object.label) {
    triples.push(quad(node, sx('objectLabel'), str(fact.assertion.object.label), g));
  }
  if (fact.attribution.wasDerivedFrom) {
    for (const derived of fact.attribution.wasDerivedFrom) {
      triples.push(quad(node, sx('derivedFrom'), str(derived), g));
    }
  }
  if (fact.attribution.span) {
    triples.push(quad(node, sx('spanStart'), str(String(fact.attribution.span.start)), g));
    triples.push(quad(node, sx('spanEnd'), str(String(fact.attribution.span.end)), g));
  }
  return triples;
};

/** Reassemble (and validate) Facts from reified triples — inverse of factToTriples. */
export const triplesToFacts = (quads: Quad[]): Fact[] => {
  const byFact = new Map<string, Map<string, RdfTerm[]>>();
  for (const q of quads) {
    const id = factIdFromIri(q.subject.value);
    let props = byFact.get(id);
    if (!props) {
      byFact.set(id, (props = new Map()));
    }
    const name = localName(q.predicate.value);
    const terms = props.get(name);
    if (terms) {
      terms.push(q.object);
    } else {
      props.set(name, [q.object]);
    }
  }

  const facts: Fact[] = [];
  for (const [id, props] of byFact) {
    const oneTerm = (name: string) => props.get(name)?.[0];
    const one = (name: string) => oneTerm(name)?.value;
    const many = (name: string) => props.get(name)?.map((term) => term.value) ?? [];
    const agentTerm = oneTerm('wasAttributedTo');
    const derivedFrom = many('derivedFrom');
    const spanStart = one('spanStart');
    const spanEnd = one('spanEnd');
    // Assemble an untyped candidate; Schema.decodeUnknownSync validates required fields and literal unions,
    // throwing on missing/invalid data rather than silently producing undefined.
    const candidate = {
      id,
      assertion: {
        subject: objectToTerm(oneTerm('subject'), one('subjectLabel')),
        predicate: one('predicate'),
        object: objectToTerm(oneTerm('object'), one('objectLabel')),
        ...(one('validFrom') !== undefined ? { validFrom: one('validFrom') } : {}),
        ...(one('validTo') !== undefined ? { validTo: one('validTo') } : {}),
        ...(one('quote') !== undefined ? { quote: one('quote') } : {}),
      },
      valence: {
        factuality: one('factuality'),
        polarity: one('polarity'),
        ...(one('confidence') !== undefined ? { confidence: Number(one('confidence')) } : {}),
        ...(one('nature') !== undefined ? { nature: one('nature') } : {}),
      },
      attribution: {
        ...(agentTerm !== undefined ? { agent: entityIdFromIri(agentTerm.value) } : {}),
        source: one('wasDerivedFrom'),
        generatedAtTime: one('generatedAtTime'),
        ...(derivedFrom.length > 0 ? { wasDerivedFrom: derivedFrom } : {}),
        ...(spanStart !== undefined && spanEnd !== undefined
          ? { span: { start: Number(spanStart), end: Number(spanEnd) } }
          : {}),
      },
      recordedAt: one('recordedAt'),
      extractor: { id: one('extractorId'), model: one('extractorModel'), version: one('extractorVersion') },
      sourceHash: one('sourceHash'),
    };
    facts.push(decodeFact(candidate));
  }
  return facts;
};
