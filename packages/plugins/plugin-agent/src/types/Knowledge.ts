//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EntityId } from '@dxos/keys';
import { RDF } from '@dxos/pipeline-rdf';

/**
 * What a memory records about its subjects. `note` is free-form markdown (see `body`); `directive`
 * holds a rule or preference until the `Rule`/`Preference` types of docs/ONTOLOGY.md §3 exist.
 */
// TODO(burdon): Move `directive` memories to Rule/Preference objects (docs/ONTOLOGY.md §3).
export const Kind = Schema.Literals([
  'fact',
  'preference',
  'goal',
  'commitment',
  'relationship',
  'event',
  'note',
  'directive',
]);
export type Kind = Schema.Schema.Type<typeof Kind>;

/** Whether the person said it (`stated`) or the agent concluded it (`inferred`). */
export const Origin = Schema.Literals(['stated', 'inferred']);
export type Origin = Schema.Schema.Type<typeof Origin>;

/** Memories are never overwritten: a contradiction supersedes, a mistake retracts. */
export const Status = Schema.Literals(['active', 'superseded', 'retracted']);
export type Status = Schema.Schema.Type<typeof Status>;

/** The predicate a memory's claim is stated with: the subject, then the claim in the agent's words. */
export const CLAIM = RDF.Ontology.DEFAULT.resolve('claim').iri;

/** The predicate a note's markdown body is stated with. */
export const NOTE = `${RDF.Vocab.DX}hasNote`;

/** A subject a memory is about: its entity key (an object URI or a member DID) and its name. */
export type Subject = { readonly id: string; readonly label?: string; readonly type?: RDF.EntityKind };

/**
 * One atomic, third-person claim the agent learned about one or more entities: a named graph in the agent's brain
 * whose statements make the claim about each subject, and whose provenance says what kind of memory it is.
 */
export type Memory = {
  /** The graph's IRI. */
  readonly id: string;
  readonly content: string;
  readonly kind: Kind;
  readonly origin: Origin;
  readonly confidence?: number;
  readonly observedAt: string;
  readonly status: Status;
  /** Entity keys of the subjects. */
  readonly subjects: readonly string[];
  /** URI of the message or chat the claim came from. */
  readonly source?: string;
  /** A note's markdown; `content` is its one-line summary. */
  readonly body?: string;
  /** The graphs this one replaces. */
  readonly supersedes?: readonly string[];
};

export type MakeProps = {
  readonly content: string;
  readonly kind: Kind;
  readonly origin?: Origin;
  readonly subjects: readonly Subject[];
  /** Who recorded it: the agent's entity id. */
  readonly agent: string;
  readonly confidence?: number;
  readonly observedAt?: string;
  readonly source?: string;
  readonly body?: string;
  /** IRI of the memory this one corrects. */
  readonly supersedes?: string;
  /** IRI of the memory this one withdraws; the graph restates the claim it withdraws. */
  readonly retracts?: string;
  /** The graph's IRI; a fresh one by default. */
  readonly id?: string;
};

/**
 * A fresh memory IRI. An entity id rather than a hash of the provenance, whose time would give every run a different
 * id: the model reads it back from Remember and Recall, and deterministic test runs pin entity ids.
 */
export const makeId = (): string => RDF.Vocab.graphIri(`memory-${EntityId.random()}`).value;

const literal = (value: string): RDF.Term => ({ kind: 'literal', literal: value });

/** The statements recording a memory, in one named graph; the first fact's `graph` is the memory's id. */
export const toFacts = ({
  content,
  kind,
  origin = 'stated',
  subjects,
  agent,
  confidence,
  observedAt = new Date().toISOString(),
  source,
  body,
  supersedes,
  retracts,
  id = makeId(),
}: MakeProps): RDF.Fact[] => {
  const fact = (subject: Subject, predicateIri: string, object: string): RDF.Fact => ({
    id: '',
    graph: id,
    assertion: {
      subject: {
        kind: 'entity',
        entity: subject.id,
        ...(subject.label ? { label: subject.label } : {}),
        ...(subject.type ? { type: subject.type } : {}),
      },
      predicate: predicateIri === CLAIM ? 'claim' : 'has note',
      predicateIri,
      object: literal(object),
    },
    // What a person stated is certain; what the agent concluded is probable.
    factuality: {
      value: origin === 'stated' ? 'CT+' : 'PR+',
      polarity: '+',
      ...(confidence !== undefined ? { confidence } : {}),
    },
    attribution: { agent, source: source ?? agent, generatedAtTime: observedAt },
    recordedAt: observedAt,
    extractor: { id: 'remember', model: 'agent', version: '1' },
    sourceHash: observedAt,
    kind,
    origin,
    ...(supersedes ? { supersedes: [supersedes] } : {}),
    ...(retracts ? { retracts: [retracts] } : {}),
  });
  const facts = [
    ...subjects.map((subject) => fact(subject, CLAIM, content)),
    ...(body !== undefined && subjects.length > 0 ? [fact(subjects[0], NOTE, body)] : []),
  ];
  return RDF.Graph.assign(facts, { name: () => `memory:${agent}` });
};

const decodeKind = Schema.decodeUnknownOption(Kind);
const decodeOrigin = Schema.decodeUnknownOption(Origin);

/** The memories among the facts, one per graph that records one; a graph that only retracts another is none. */
export const fromFacts = (facts: readonly RDF.Fact[]): Memory[] => {
  const statuses = RDF.Graph.status(facts);
  const graphs = new Map<string, RDF.Fact[]>();
  for (const fact of facts) {
    if (fact.kind !== undefined && fact.graph !== undefined && !fact.retracts?.length) {
      graphs.set(fact.graph, [...(graphs.get(fact.graph) ?? []), fact]);
    }
  }
  return [...graphs].flatMap(([graph, statements]) => {
    const claims = statements.filter((fact) => fact.assertion.predicateIri === CLAIM);
    const [first] = claims;
    const kind = decodeKind(first?.kind);
    if (!first || first.assertion.object.kind !== 'literal' || kind._tag === 'None') {
      return [];
    }
    const origin = decodeOrigin(first.origin);
    const note = statements.find((fact) => fact.assertion.predicateIri === NOTE)?.assertion.object;
    return [
      {
        id: graph,
        content: first.assertion.object.literal,
        kind: kind.value,
        origin: origin._tag === 'Some' ? origin.value : 'stated',
        ...(first.factuality.confidence !== undefined ? { confidence: first.factuality.confidence } : {}),
        observedAt: first.attribution.generatedAtTime,
        status: statuses.get(graph) ?? 'active',
        subjects: claims.map((fact) => RDF.termValue(fact.assertion.subject)),
        ...(first.attribution.source !== first.attribution.agent ? { source: first.attribution.source } : {}),
        ...(note?.kind === 'literal' ? { body: note.literal } : {}),
        ...(first.supersedes ? { supersedes: first.supersedes } : {}),
      },
    ];
  });
};

/** The statements withdrawing a memory: a graph that restates its claim and retracts it. */
export const retract = (memory: Memory, agent: string): RDF.Fact[] =>
  toFacts({
    content: memory.content,
    kind: memory.kind,
    origin: memory.origin,
    agent,
    subjects: memory.subjects.map((id) => ({ id })),
    retracts: memory.id,
  });

/** Newest first; the id breaks ties so equal timestamps keep a stable order. */
export const byNewest = (left: Memory, right: Memory): number =>
  right.observedAt.localeCompare(left.observedAt) || right.id.localeCompare(left.id);

/** Whether the memory is about the entity, by any of the keys facts about it may use. */
export const isAbout = (memory: Memory, keys: ReadonlySet<string>): boolean =>
  memory.subjects.some((subject) => keys.has(subject));
