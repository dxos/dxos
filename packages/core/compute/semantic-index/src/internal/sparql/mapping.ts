//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { DataFactory, type Literal, type NamedNode, type Quad, type Term as RdfTerm } from 'n3';

import { type Term, Fact } from '../../types';
import { ENTITY, entityIdFromIri, entityIri, factIdFromIri, factIri, prov, str, sx } from '../vocab';

const { quad, defaultGraph } = DataFactory;

const decodeFact = Schema.decodeUnknownSync(Fact);

const localName = (iri: string) => iri.replace(/^.*[#/]/, '');
const termToObject = (term: Term): NamedNode | Literal => ('entity' in term ? entityIri(term.entity) : str(term.literal));
const objectToTerm = (term: RdfTerm | undefined): Term | undefined =>
  term === undefined
    ? undefined
    : term.termType === 'NamedNode' && term.value.startsWith(ENTITY)
      ? { entity: entityIdFromIri(term.value) }
      : { literal: term.value };

/**
 * Plain RDF reification of a Fact.
 *
 * `attribution.source` is serialized to `prov:wasDerivedFrom` (the Task 6 query-builder filters on it).
 * The optional `attribution.wasDerivedFrom` (array) and `attribution.span` are intentionally NOT mapped in v1
 * because the pipeline does not yet produce them.
 *
 * Invariant: every serialized predicate must have a UNIQUE local name (reassembly keys annotations by local name).
 * When `wasDerivedFrom` is added later it must NOT reuse the `prov:wasDerivedFrom` predicate already used for `source`.
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
  return triples;
};

/** Reassemble (and validate) Facts from reified triples — inverse of factToTriples. */
export const triplesToFacts = (quads: Quad[]): Fact[] => {
  const byFact = new Map<string, Map<string, RdfTerm>>();
  for (const q of quads) {
    const id = factIdFromIri(q.subject.value);
    let props = byFact.get(id);
    if (!props) {
      byFact.set(id, (props = new Map()));
    }
    props.set(localName(q.predicate.value), q.object);
  }

  const facts: Fact[] = [];
  for (const [id, props] of byFact) {
    const value = (name: string) => props.get(name)?.value;
    const agentTerm = props.get('wasAttributedTo');
    // Assemble an untyped candidate; Schema.decodeUnknownSync validates required fields and literal unions,
    // throwing on missing/invalid data rather than silently producing undefined.
    const candidate = {
      id,
      assertion: {
        subject: objectToTerm(props.get('subject')),
        predicate: value('predicate'),
        object: objectToTerm(props.get('object')),
        ...(value('validFrom') !== undefined ? { validFrom: value('validFrom') } : {}),
        ...(value('validTo') !== undefined ? { validTo: value('validTo') } : {}),
        ...(value('quote') !== undefined ? { quote: value('quote') } : {}),
      },
      valence: {
        factuality: value('factuality'),
        polarity: value('polarity'),
        ...(value('confidence') !== undefined ? { confidence: Number(value('confidence')) } : {}),
        ...(value('nature') !== undefined ? { nature: value('nature') } : {}),
      },
      attribution: {
        ...(agentTerm !== undefined ? { agent: entityIdFromIri(agentTerm.value) } : {}),
        source: value('wasDerivedFrom'),
        generatedAtTime: value('generatedAtTime'),
      },
      recordedAt: value('recordedAt'),
      extractor: { id: value('extractorId'), model: value('extractorModel'), version: value('extractorVersion') },
      sourceHash: value('sourceHash'),
    };
    facts.push(decodeFact(candidate));
  }
  return facts;
};
