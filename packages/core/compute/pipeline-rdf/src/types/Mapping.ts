//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import { DataFactory, type Literal, type NamedNode, type Quad, type Term as RdfTerm } from 'n3';

import { hashText } from '../internal/stages/reconcile.ts';
import { type Term } from './Assertion.ts';
import { type EntityKind } from './Entity.ts';
import { Fact } from './Fact.ts';
import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';

const { quad, defaultGraph, namedNode } = DataFactory;

const decodeFact = Schema.decodeUnknownSync(Fact);

const localName = (iri: string) => iri.replace(/^.*[#/]/, '');

//
// Storage shape: each statement is a real triple inside a named graph, and the graph's provenance is stated once,
// about the graph, in the default graph. Entities carry their labels and kinds inside the graph that mentions them,
// and one known by a label alone has an IRI local to that graph; a predicate the ontology does not define is
// described (label, comment, defining namespace) in the ontology graph.
//
// Invariant: every provenance predicate has a UNIQUE local name (reassembly keys provenance by local name).
// `attribution.source` is `prov:wasDerivedFrom`; `attribution.wasDerivedFrom` uses `sx:derivedFrom` so the two
// never collide. `illocution` is flattened to `sx:force` / `sx:mood` / `sx:addressee`.
//

const CLASSES: Record<EntityKind, string> = {
  person: `${Vocab.SCHEMA}Person`,
  org: `${Vocab.SCHEMA}Organization`,
  place: `${Vocab.SCHEMA}Place`,
  event: `${Vocab.SCHEMA}Event`,
  concept: `${Vocab.SKOS}Concept`,
  thing: `${Vocab.SCHEMA}Thing`,
};

// Facts stored before the kinds moved to schema.org typed entities with `dx:` classes.
const LEGACY_CLASSES: Record<EntityKind, string> = {
  person: `${Vocab.DX}Person`,
  org: `${Vocab.DX}Organization`,
  place: `${Vocab.DX}Place`,
  event: `${Vocab.DX}Event`,
  concept: `${Vocab.DX}Concept`,
  thing: `${Vocab.DX}Thing`,
};

const KINDS = new Map(
  [...Object.entries(CLASSES), ...Object.entries(LEGACY_CLASSES)].map(([kind, iri]) => [iri, kind as EntityKind]),
);

/** The class IRIs an entity's kind is typed with; an `rdf:type` to any other class is a statement, not a kind. */
export const KIND_CLASSES: ReadonlyArray<string> = [...KINDS.keys()];

/** Whether a quad states an entity's kind (an `rdf:type` to a kind class) rather than making a statement. */
export const isKindQuad = (predicate: string, object: string): boolean =>
  predicate === Vocab.RDF_TYPE && KINDS.has(object);

/** The class IRI an entity of this kind is typed with. */
export const classIri = (kind: EntityKind): string => CLASSES[kind];

/**
 * RDF has no literal subjects, so a literal subject is stored as the entity it names. An entity slug is local to the
 * graph: the extractor resolved it to no stable IRI, and a label alone does not say two graphs mean one thing.
 */
const subjectNode = (term: Term, graph: string): NamedNode =>
  term.kind === 'entity' ? Vocab.entityNode(term.entity, graph) : Vocab.localEntityIri(graph, term.literal);

const objectNode = (term: Term, graph: string): NamedNode | Literal =>
  term.kind === 'entity' ? Vocab.entityNode(term.entity, graph) : Vocab.str(term.literal);

/** The graph IRI a fact is stored in: its own graph unless it names one. */
export const graphOf = (fact: Fact): string => fact.graph ?? Vocab.factIri(fact.id).value;

/** The predicate IRI a fact is stored with. */
export const predicateOf = (fact: Fact, ontology: Ontology.Ontology = Ontology.DEFAULT): string =>
  fact.assertion.predicateIri ?? ontology.resolve(fact.assertion.predicate).iri;

const nodeKey = (term: RdfTerm): string => (term.termType === 'Literal' ? JSON.stringify(term.value) : term.value);

/** A statement's id within a named graph, from the triple itself, so writing and reading agree. */
const statementId = (graph: string, subject: RdfTerm, predicate: string, object: RdfTerm): string =>
  `${graph}#${hashText(`${nodeKey(subject)} ${predicate} ${nodeKey(object)}`)}`;

/** The id a fact has once stored in `graph` ({@link triplesToFacts} reads it back). */
export const idInGraph = (fact: Fact, graph: string, ontology: Ontology.Ontology = Ontology.DEFAULT): string =>
  graph.startsWith(Vocab.FACT)
    ? Vocab.factIdFromIri(graph)
    : statementId(
        graph,
        subjectNode(fact.assertion.subject, graph),
        predicateOf(fact, ontology),
        objectNode(fact.assertion.object, graph),
      );

/** Expands a fact into its statement, the descriptions of its entities, and its graph's provenance. */
export const factToTriples = (fact: Fact, ontology: Ontology.Ontology = Ontology.DEFAULT): Quad[] => {
  const graph = namedNode(graphOf(fact));
  const meta = defaultGraph();
  const predicate = predicateOf(fact, ontology);
  const subject = subjectNode(fact.assertion.subject, graph.value);
  const object = objectNode(fact.assertion.object, graph.value);
  const quads: Quad[] = [quad(subject, namedNode(predicate), object, graph)];

  for (const [node, term] of [
    [subject, fact.assertion.subject],
    [object, fact.assertion.object],
  ] as const) {
    if (node.termType !== 'NamedNode') {
      continue;
    }
    const label = term.kind === 'entity' ? term.label : term.literal;
    if (label !== undefined) {
      quads.push(quad(node, namedNode(Vocab.RDFS_LABEL), Vocab.str(label), graph));
    }
    if (term.kind === 'entity' && term.type) {
      quads.push(quad(node, namedNode(Vocab.RDF_TYPE), namedNode(classIri(term.type)), graph));
    }
  }

  // A predicate the ontology does not define is described in the ontology graph, never inside the statement's.
  if (!ontology.get(predicate)) {
    const definition: Ontology.Entry = {
      iri: predicate,
      name: Ontology.key(fact.assertion.predicate),
      label: fact.assertion.predicate,
      ...(fact.assertion.predicateDescription ? { description: fact.assertion.predicateDescription } : {}),
      ...(Vocab.brainNamespaceOf(predicate) ? { definedBy: Vocab.brainNamespaceOf(predicate) } : {}),
    };
    quads.push(...Ontology.toQuads(definition));
  }

  const about = (name: NamedNode, value: NamedNode | Literal) => quads.push(quad(graph, name, value, meta));
  about(namedNode(Vocab.RDF_TYPE), namedNode(Vocab.SX_GRAPH));
  about(Vocab.sx('factuality'), Vocab.str(fact.factuality.value));
  about(Vocab.sx('polarity'), Vocab.str(fact.factuality.polarity));
  about(Vocab.prov('wasDerivedFrom'), Vocab.str(fact.attribution.source));
  about(Vocab.prov('generatedAtTime'), Vocab.str(fact.attribution.generatedAtTime));
  about(Vocab.sx('recordedAt'), Vocab.str(fact.recordedAt));
  about(Vocab.sx('sourceHash'), Vocab.str(fact.sourceHash));
  about(Vocab.sx('extractorId'), Vocab.str(fact.extractor.id));
  about(Vocab.sx('extractorModel'), Vocab.str(fact.extractor.model));
  about(Vocab.sx('extractorVersion'), Vocab.str(fact.extractor.version));
  const optional: ReadonlyArray<[NamedNode, string | undefined]> = [
    [Vocab.sx('confidence'), fact.factuality.confidence?.toString()],
    [Vocab.sx('nature'), fact.factuality.nature],
    [Vocab.sx('validFrom'), fact.assertion.validFrom],
    [Vocab.sx('validTo'), fact.assertion.validTo],
    [Vocab.sx('quote'), fact.assertion.quote],
    [Vocab.sx('agentLabel'), fact.attribution.agentLabel],
    [Vocab.sx('spanStart'), fact.attribution.span?.start.toString()],
    [Vocab.sx('spanEnd'), fact.attribution.span?.end.toString()],
    [Vocab.sx('force'), fact.illocution?.force],
    [Vocab.sx('mood'), fact.illocution?.mood],
    [Vocab.sx('addressee'), fact.illocution?.addressee],
    [Vocab.sx('pass'), fact.pass],
    [Vocab.sx('kind'), fact.kind],
    [Vocab.sx('origin'), fact.origin],
  ];
  for (const [name, value] of optional) {
    if (value !== undefined) {
      about(name, Vocab.str(value));
    }
  }
  if (fact.attribution.agent) {
    about(Vocab.prov('wasAttributedTo'), Vocab.entityNode(fact.attribution.agent, graph.value));
  }
  for (const derived of fact.attribution.wasDerivedFrom ?? []) {
    about(Vocab.sx('derivedFrom'), Vocab.str(derived));
  }
  for (const superseded of fact.supersedes ?? []) {
    about(Vocab.sx('supersedes'), namedNode(superseded));
  }
  for (const retracted of fact.retracts ?? []) {
    about(Vocab.sx('retracts'), namedNode(retracted));
  }
  return quads;
};

/** Reassembles (and validates) facts from quads: the inverse of {@link factToTriples}, one fact per statement. */
export const triplesToFacts = (quads: readonly Quad[], ontology: Ontology.Ontology = Ontology.DEFAULT): Fact[] => {
  const labels = new Map<string, string>();
  const comments = new Map<string, string>();
  const provenance = new Map<string, Map<string, RdfTerm[]>>();
  const graphs = new Map<string, { statements: Quad[]; labels: Map<string, string>; types: Map<string, EntityKind> }>();
  const graphFor = (iri: string) => {
    let graph = graphs.get(iri);
    if (!graph) {
      graphs.set(iri, (graph = { statements: [], labels: new Map(), types: new Map() }));
    }
    return graph;
  };

  for (const entry of quads) {
    if (entry.graph.termType === 'DefaultGraph') {
      let props = provenance.get(entry.subject.value);
      if (!props) {
        provenance.set(entry.subject.value, (props = new Map()));
      }
      const name = localName(entry.predicate.value);
      props.set(name, [...(props.get(name) ?? []), entry.object]);
    } else if (entry.graph.value === Vocab.ONTOLOGY_GRAPH) {
      const known =
        entry.predicate.value === Vocab.RDFS_LABEL
          ? labels
          : entry.predicate.value === Vocab.RDFS_COMMENT
            ? comments
            : undefined;
      if (known && !known.has(entry.subject.value)) {
        known.set(entry.subject.value, entry.object.value);
      }
    } else if (entry.predicate.value === Vocab.RDFS_LABEL) {
      const graph = graphFor(entry.graph.value);
      if (!graph.labels.has(entry.subject.value)) {
        graph.labels.set(entry.subject.value, entry.object.value);
      }
    } else {
      const kind = entry.predicate.value === Vocab.RDF_TYPE ? KINDS.get(entry.object.value) : undefined;
      if (kind) {
        graphFor(entry.graph.value).types.set(entry.subject.value, kind);
      } else {
        graphFor(entry.graph.value).statements.push(entry);
      }
    }
  }

  const facts: Fact[] = [];
  for (const [iri, graph] of graphs) {
    const props = provenance.get(iri) ?? new Map<string, RdfTerm[]>();
    const one = (name: string) => props.get(name)?.[0]?.value;
    const many = (name: string) => props.get(name)?.map((term) => term.value) ?? [];
    const term = (node: RdfTerm): Term | undefined =>
      node.termType === 'Literal'
        ? { kind: 'literal', literal: node.value }
        : node.termType === 'NamedNode'
          ? {
              kind: 'entity',
              entity: Vocab.entityKey(node.value, iri),
              ...(graph.labels.has(node.value) ? { label: graph.labels.get(node.value) } : {}),
              ...(graph.types.has(node.value) ? { type: graph.types.get(node.value) } : {}),
            }
          : undefined;
    const agent = props.get('wasAttributedTo')?.[0];
    const derivedFrom = many('derivedFrom');
    const supersedes = many('supersedes');
    const retracts = many('retracts');
    const spanStart = one('spanStart');
    const spanEnd = one('spanEnd');
    const force = one('force');
    const own = iri.startsWith(Vocab.FACT);

    for (const statement of graph.statements) {
      const predicate = statement.predicate.value;
      // An untyped candidate; decoding validates required fields and literal unions, so missing provenance throws.
      const candidate = {
        id: own ? Vocab.factIdFromIri(iri) : statementId(iri, statement.subject, predicate, statement.object),
        ...(own ? {} : { graph: iri }),
        assertion: {
          subject: term(statement.subject),
          predicate: labels.get(predicate) ?? ontology.get(predicate)?.label ?? Ontology.labelFromIri(predicate),
          predicateIri: predicate,
          ...(comments.has(predicate) && !ontology.get(predicate)
            ? { predicateDescription: comments.get(predicate) }
            : {}),
          object: term(statement.object),
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
          ...(agent !== undefined ? { agent: Vocab.entityKey(agent.value, iri) } : {}),
          ...(one('agentLabel') !== undefined ? { agentLabel: one('agentLabel') } : {}),
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
        ...(one('pass') !== undefined ? { pass: one('pass') } : {}),
        ...(one('kind') !== undefined ? { kind: one('kind') } : {}),
        ...(one('origin') !== undefined ? { origin: one('origin') } : {}),
        ...(supersedes.length > 0 ? { supersedes } : {}),
        ...(retracts.length > 0 ? { retracts } : {}),
      };
      facts.push(decodeFact(candidate));
    }
  }
  return facts;
};
