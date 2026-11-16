//
// Copyright 2026 DXOS.org
//

import { type Row, type SqlStorage, type SqlStorageValue, type Term } from '@dxos/sparql-sqlite';

import { type EntityKind } from '../types/index.ts';
import * as Mapping from '../types/Mapping.ts';
import * as Vocab from '../types/Vocab.ts';
import {
  type EntityFactsQuery,
  type EntityFilter,
  type EntitySummary,
  type EntityWindow,
  type EntityWindowQuery,
} from './fact-store.ts';

//
// An in-memory index of the entities a store's statements name, built from the SQL tables `@dxos/sparql-sqlite`
// keeps (`terms` interns each RDF term once, `quads` holds term ids, graph 0 is the default graph). Reading the tables
// directly costs two scans; the same through SPARQL would materialize every quad as term objects first.
//

/** Statement graphs per entity whose facts {@link EntityIndex.graphsFor} returns when the query names no limit. */
const DEFAULT_FACT_GRAPHS = 100;

const SUBJECT = 0;
const OBJECT = 1;

type Entry = {
  readonly key: string;
  label?: string;
  kind?: EntityKind;
  /** Sort key: the label (else key), lowercased. */
  sort: string;
  /** One element per statement the entity takes part in, in parallel arrays of term ids (and its role). */
  readonly graphs: number[];
  readonly predicates: number[];
  readonly roles: number[];
  readonly subjects: number[];
  readonly objects: number[];
};

export type EntityIndex = {
  readonly window: (query: EntityWindowQuery) => EntityWindow;
  /**
   * The quads stating what the entities take part in (at most `limit` graphs each, newest first), with the labels and
   * kinds of the nodes they name and their graphs' provenance, as `?g ?s ?p ?o` rows (`?s` unbound for provenance).
   */
  readonly rowsFor: (query: EntityFactsQuery) => Row[];
  /** Statements per predicate IRI. */
  readonly predicateUsage: () => Record<string, number>;
};

const asId = (value: SqlStorageValue | undefined): number => {
  if (typeof value !== 'number') {
    throw new TypeError('Expected a numeric term id');
  }
  return value;
};

const asText = (value: SqlStorageValue | undefined): string => {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a text column');
  }
  return value;
};

/** `@dxos/sparql-sqlite`'s term kinds (its `Kind`): an IRI, a blank node, a plain or language-tagged string. */
const KIND_IRI = 0;
const KIND_BLANK = 1;
const KIND_STRING = 2;
const KIND_LANG = 3;

/** Binds a set of ids as one JSON parameter, since a Durable Object allows only 100 bound parameters. */
const IN_IDS = 'IN (SELECT value FROM json_each(?))';

/** Reads the store's statements into an {@link EntityIndex}. */
export const buildEntityIndex = (storage: SqlStorage): EntityIndex => {
  // Named nodes only (kind 0): literals and blank nodes never name an entity.
  const iris = new Map<number, string>();
  const ids = new Map<string, number>();
  for (const [id, lex] of storage.exec('SELECT id, lex FROM terms WHERE kind = 0').raw()) {
    iris.set(asId(id), asText(lex));
    ids.set(asText(lex), asId(id));
  }
  const ontology = ids.get(Vocab.ONTOLOGY_GRAPH) ?? -1;
  const label = ids.get(Vocab.RDFS_LABEL) ?? -1;
  const type = ids.get(Vocab.RDF_TYPE) ?? -1;
  const kindClasses = new Map<number, EntityKind>();
  for (const iri of Mapping.KIND_CLASSES) {
    const id = ids.get(iri);
    const kind = Mapping.kindOfClass(iri);
    if (id !== undefined && kind) {
      kindClasses.set(id, kind);
    }
  }

  const entries = new Map<string, Entry>();
  const keyOf = (node: string, graph: string): string => Vocab.entityKey(node, graph);
  const entry = (node: number, graph: number): Entry | undefined => {
    const iri = iris.get(node);
    const graphIri = iris.get(graph);
    if (iri === undefined || graphIri === undefined) {
      return undefined;
    }
    const key = keyOf(iri, graphIri);
    let found = entries.get(key);
    if (!found) {
      found = { key, sort: key.toLowerCase(), graphs: [], predicates: [], roles: [], subjects: [], objects: [] };
      entries.set(key, found);
    }
    return found;
  };

  const usage = new Map<number, number>();
  const kinds: [node: number, graph: number, kind: EntityKind][] = [];
  for (const [s, p, o, g] of storage.exec('SELECT s, p, o, g FROM quads WHERE g <> 0 AND g <> ?', ontology).raw()) {
    const subject = asId(s);
    const predicate = asId(p);
    const object = asId(o);
    const graph = asId(g);
    // Labels are read with their text below.
    if (predicate === label) {
      continue;
    }
    const kind = predicate === type ? kindClasses.get(object) : undefined;
    if (kind) {
      kinds.push([subject, graph, kind]);
      continue;
    }
    usage.set(predicate, (usage.get(predicate) ?? 0) + 1);
    const add = (target: Entry | undefined, role: number) => {
      target?.graphs.push(graph);
      target?.predicates.push(predicate);
      target?.roles.push(role);
      target?.subjects.push(subject);
      target?.objects.push(object);
    };
    add(entry(subject, graph), SUBJECT);
    add(iris.has(object) ? entry(object, graph) : undefined, OBJECT);
  }

  // Labels are literals, which the IRI map leaves out, so they are read with their text.
  for (const [s, g, lex] of storage
    .exec(
      'SELECT q.s, q.g, t.lex FROM quads q JOIN terms t ON t.id = q.o WHERE q.p = ? AND q.g <> 0 AND q.g <> ?',
      label,
      ontology,
    )
    .raw()) {
    const target = entries.get(keyOf(iris.get(asId(s)) ?? '', iris.get(asId(g)) ?? ''));
    if (target && target.label === undefined) {
      target.label = asText(lex);
      target.sort = target.label.toLowerCase();
    }
  }
  for (const [node, graph, kind] of kinds) {
    const target = entries.get(keyOf(iris.get(node) ?? '', iris.get(graph) ?? ''));
    if (target && target.kind === undefined) {
      target.kind = kind;
    }
  }

  // Only entities that take part in a statement are listed; a label or kind alone states nothing about them.
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const sorted = [...entries.values()]
    .filter((candidate) => candidate.graphs.length > 0)
    .sort((left, right) => collator.compare(left.sort, right.sort) || (left.key < right.key ? -1 : 1));

  const predicateIds = (filter: EntityFilter): Set<number> | undefined =>
    filter.predicates === undefined
      ? undefined
      : new Set(filter.predicates.flatMap((iri) => (ids.has(iri) ? [ids.get(iri) ?? -1] : [])));

  /** Whether statement `index` of `candidate` passes the filter. */
  const statementPasses = (
    candidate: Entry,
    index: number,
    role: EntityFilter['role'],
    predicates: Set<number> | undefined,
  ): boolean =>
    (role !== 'subject' || candidate.roles[index] === SUBJECT) &&
    (predicates === undefined || predicates.has(candidate.predicates[index]));

  const passes = (candidate: Entry, filter: EntityFilter, predicates: Set<number> | undefined): boolean => {
    if (filter.role !== 'subject' && predicates === undefined) {
      return true;
    }
    for (let index = 0; index < candidate.graphs.length; index++) {
      if (statementPasses(candidate, index, filter.role, predicates)) {
        return true;
      }
    }
    return false;
  };

  const window = (query: EntityWindowQuery): EntityWindow => {
    const text = query.text?.trim().toLowerCase() ?? '';
    const predicates = predicateIds(query);
    const counts = new Map<EntityKind, number>();
    const items: EntitySummary[] = [];
    let total = 0;
    for (const candidate of sorted) {
      if (text && !candidate.sort.includes(text) && !candidate.key.toLowerCase().includes(text)) {
        continue;
      }
      if (!passes(candidate, query, predicates)) {
        continue;
      }
      if (candidate.kind) {
        counts.set(candidate.kind, (counts.get(candidate.kind) ?? 0) + 1);
      }
      if (query.kind !== undefined && candidate.kind !== query.kind) {
        continue;
      }
      if (total >= query.offset && items.length < query.limit) {
        items.push({
          key: candidate.key,
          label: candidate.label ?? candidate.key,
          ...(candidate.kind ? { kind: candidate.kind } : {}),
        });
      }
      total++;
    }
    return {
      total,
      items,
      kinds: [...counts].map(([kind, count]) => ({ kind, count })).sort((left, right) => right.count - left.count),
    };
  };

  const datatypes = new Map<number, string>();
  for (const [id, iri] of storage.exec('SELECT id, iri FROM dts').raw()) {
    datatypes.set(asId(id), asText(iri));
  }

  /** The terms with these ids, decoded as the engine stores them. */
  const termsOf = (termIds: ReadonlySet<number>): Map<number, Term> => {
    const terms = new Map<number, Term>();
    for (const [id, kind, lex, dt, lang] of storage
      .exec(`SELECT id, kind, lex, dt, lang FROM terms WHERE id ${IN_IDS}`, JSON.stringify([...termIds]))
      .raw()) {
      const value = asText(lex);
      const datatype = typeof dt === 'number' ? datatypes.get(dt) : undefined;
      terms.set(
        asId(id),
        kind === KIND_IRI
          ? { termType: 'NamedNode', value }
          : kind === KIND_BLANK
            ? { termType: 'BlankNode', value }
            : kind === KIND_LANG && typeof lang === 'string'
              ? { termType: 'Literal', value, language: lang }
              : kind === KIND_STRING || datatype === undefined
                ? { termType: 'Literal', value }
                : { termType: 'Literal', value, datatype },
      );
    }
    return terms;
  };

  const rowsFor = (query: EntityFactsQuery): Row[] => {
    const predicates = predicateIds(query);
    const limit = query.limit ?? DEFAULT_FACT_GRAPHS;
    const graphs = new Set<number>();
    const nodes = new Set<number>();
    for (const key of query.keys) {
      const candidate = entries.get(key);
      if (!candidate) {
        continue;
      }
      const passing: number[] = [];
      for (let index = 0; index < candidate.graphs.length; index++) {
        if (statementPasses(candidate, index, query.role, predicates)) {
          passing.push(index);
        }
      }
      // Term ids grow as terms are first written, so the highest graph ids are the newest statements.
      const newest = new Set(
        [...new Set(passing.map((index) => candidate.graphs[index]))]
          .sort((left, right) => right - left)
          .slice(0, limit),
      );
      for (const index of passing) {
        if (newest.has(candidate.graphs[index])) {
          graphs.add(candidate.graphs[index]);
          nodes.add(candidate.subjects[index]);
          nodes.add(candidate.objects[index]);
        }
      }
    }
    if (graphs.size === 0) {
      return [];
    }

    // The primary key leads with the subject, so the statements and labels of the named nodes are read by key.
    const quads: [s: number | undefined, p: number, o: number, g: number][] = [];
    for (const [s, p, o, g] of storage
      .exec(
        `SELECT s, p, o, g FROM quads WHERE s ${IN_IDS} AND g ${IN_IDS}`,
        JSON.stringify([...nodes]),
        JSON.stringify([...graphs]),
      )
      .raw()) {
      quads.push([asId(s), asId(p), asId(o), asId(g)]);
    }
    for (const [s, p, o] of storage
      .exec(`SELECT s, p, o FROM quads WHERE g = 0 AND s ${IN_IDS}`, JSON.stringify([...graphs]))
      .raw()) {
      quads.push([undefined, asId(p), asId(o), asId(s)]);
    }
    const terms = termsOf(new Set(quads.flatMap(([s, p, o, g]) => (s === undefined ? [p, o, g] : [s, p, o, g]))));
    return quads.map(([s, p, o, g]) => ({
      g: terms.get(g),
      s: s === undefined ? undefined : terms.get(s),
      p: terms.get(p),
      o: terms.get(o),
    }));
  };

  const predicateUsage = (): Record<string, number> =>
    Object.fromEntries(
      [...usage].flatMap(([predicate, count]) => {
        const iri = iris.get(predicate);
        return iri === undefined ? [] : [[iri, count]];
      }),
    );

  return { window, rowsFor, predicateUsage };
};
