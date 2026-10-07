//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import { DataFactory, type Literal, type NamedNode, type Quad, type Term as RdfTerm } from 'n3';

import { type Term } from './Assertion.ts';
import { Fact } from './Fact.ts';
import * as Vocab from './Vocab.ts';

const { quad, defaultGraph } = DataFactory;

const decodeFact = Schema.decodeUnknownSync(Fact);

const localName = (iri: string) => iri.replace(/^.*[#/]/, '');
const termToObject = (term: Term): NamedNode | Literal =>
  'entity' in term ? Vocab.entityIri(term.entity) : Vocab.str(term.literal);
const objectToTerm = (term: RdfTerm | undefined, label?: string): Term | undefined =>
  term === undefined
    ? undefined
    : term.termType === 'NamedNode' && term.value.startsWith(Vocab.ENTITY)
      ? { entity: Vocab.entityIdFromIri(term.value), ...(label !== undefined ? { label } : {}) }
      : { literal: term.value };

/**
 * Plain RDF reification of a Fact.
 *
 * `attribution.source` is serialized to `prov:wasDerivedFrom` (the Task 6 query-builder filters on it).
 *
 * Invariant: every serialized predicate must have a UNIQUE local name (reassembly keys annotations by local name).
 * `attribution.wasDerivedFrom` (array) uses the `sx:derivedFrom` predicate — a distinct local name from the
 * `prov:wasDerivedFrom` used for `source` — so the two never collide on reassembly.
 * `illocution` is flattened to `sx:force` / `sx:mood` / `sx:addressee`; absent `force` means no illocution.
 */

/** Expand a Fact into plain reified triples (a Fact node + annotation triples). */
export const factToTriples = (fact: Fact): Quad[] => {
  const node = Vocab.factIri(fact.id);
  const g = defaultGraph();
  const triples: Quad[] = [
    quad(node, Vocab.sx('subject'), termToObject(fact.assertion.subject), g),
    quad(node, Vocab.sx('predicate'), Vocab.str(fact.assertion.predicate), g),
    quad(node, Vocab.sx('object'), termToObject(fact.assertion.object), g),
    quad(node, Vocab.sx('factuality'), Vocab.str(fact.factuality.value), g),
    quad(node, Vocab.sx('polarity'), Vocab.str(fact.factuality.polarity), g),
    quad(node, Vocab.prov('wasDerivedFrom'), Vocab.str(fact.attribution.source), g),
    quad(node, Vocab.prov('generatedAtTime'), Vocab.str(fact.attribution.generatedAtTime), g),
    quad(node, Vocab.sx('recordedAt'), Vocab.str(fact.recordedAt), g),
    quad(node, Vocab.sx('sourceHash'), Vocab.str(fact.sourceHash), g),
    quad(node, Vocab.sx('extractorId'), Vocab.str(fact.extractor.id), g),
    quad(node, Vocab.sx('extractorModel'), Vocab.str(fact.extractor.model), g),
    quad(node, Vocab.sx('extractorVersion'), Vocab.str(fact.extractor.version), g),
  ];
  if (fact.attribution.agent) {
    triples.push(quad(node, Vocab.prov('wasAttributedTo'), Vocab.entityIri(fact.attribution.agent), g));
  }
  if (fact.factuality.confidence !== undefined) {
    triples.push(quad(node, Vocab.sx('confidence'), Vocab.str(String(fact.factuality.confidence)), g));
  }
  if (fact.factuality.nature) {
    triples.push(quad(node, Vocab.sx('nature'), Vocab.str(fact.factuality.nature), g));
  }
  if (fact.assertion.validFrom) {
    triples.push(quad(node, Vocab.sx('validFrom'), Vocab.str(fact.assertion.validFrom), g));
  }
  if (fact.assertion.validTo) {
    triples.push(quad(node, Vocab.sx('validTo'), Vocab.str(fact.assertion.validTo), g));
  }
  if (fact.assertion.quote) {
    triples.push(quad(node, Vocab.sx('quote'), Vocab.str(fact.assertion.quote), g));
  }
  // Preserve the original surface form for display (entity ids are lowercased slugs).
  if ('entity' in fact.assertion.subject && fact.assertion.subject.label) {
    triples.push(quad(node, Vocab.sx('subjectLabel'), Vocab.str(fact.assertion.subject.label), g));
  }
  if ('entity' in fact.assertion.object && fact.assertion.object.label) {
    triples.push(quad(node, Vocab.sx('objectLabel'), Vocab.str(fact.assertion.object.label), g));
  }
  if (fact.attribution.wasDerivedFrom) {
    for (const derived of fact.attribution.wasDerivedFrom) {
      triples.push(quad(node, Vocab.sx('derivedFrom'), Vocab.str(derived), g));
    }
  }
  if (fact.attribution.span) {
    triples.push(quad(node, Vocab.sx('spanStart'), Vocab.str(String(fact.attribution.span.start)), g));
    triples.push(quad(node, Vocab.sx('spanEnd'), Vocab.str(String(fact.attribution.span.end)), g));
  }
  if (fact.illocution) {
    triples.push(quad(node, Vocab.sx('force'), Vocab.str(fact.illocution.force), g));
    if (fact.illocution.mood) {
      triples.push(quad(node, Vocab.sx('mood'), Vocab.str(fact.illocution.mood), g));
    }
    if (fact.illocution.addressee !== undefined) {
      triples.push(quad(node, Vocab.sx('addressee'), Vocab.str(fact.illocution.addressee), g));
    }
  }
  return triples;
};

/** Reassemble (and validate) Facts from reified triples — inverse of factToTriples. */
export const triplesToFacts = (quads: Quad[]): Fact[] => {
  const byFact = new Map<string, Map<string, RdfTerm[]>>();
  for (const q of quads) {
    const id = Vocab.factIdFromIri(q.subject.value);
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
    const force = one('force');
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
      factuality: {
        value: one('factuality'),
        polarity: one('polarity'),
        ...(one('confidence') !== undefined ? { confidence: Number(one('confidence')) } : {}),
        ...(one('nature') !== undefined ? { nature: one('nature') } : {}),
      },
      ...(force !== undefined
        ? {
            illocution: {
              force,
              ...(one('mood') !== undefined ? { mood: one('mood') } : {}),
              ...(one('addressee') !== undefined ? { addressee: one('addressee') } : {}),
            },
          }
        : {}),
      attribution: {
        ...(agentTerm !== undefined ? { agent: Vocab.entityIdFromIri(agentTerm.value) } : {}),
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
