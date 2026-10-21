//
// Copyright 2026 DXOS.org
//

import { type Quad, type Term, XSD } from '../src/index.ts';

/**
 * Seedable generator of random but valid SPARQL SELECT queries over a dataset's actual predicates
 * and values. Shapes are kept deterministic across engines: no LIMIT without a total order, no
 * SAMPLE, no GROUP_CONCAT (member order is unspecified), ORDER BY only over values of one kind.
 */

const NUMERIC = new Set(['integer', 'decimal', 'double', 'float', 'int', 'long'].map((name) => `${XSD}${name}`));

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

type ObjectKind = 'iri' | 'num' | 'str' | 'lang' | 'date' | 'other';

const kindOf = (term: Term): ObjectKind => {
  if (term.termType !== 'Literal') {
    return 'iri';
  }
  if (term.language) {
    return 'lang';
  }
  if (term.datatype && NUMERIC.has(term.datatype)) {
    return 'num';
  }
  if (term.datatype === `${XSD}dateTime`) {
    return 'date';
  }
  return term.datatype ? 'other' : 'str';
};

/** SPARQL syntax for a constant term. */
export const sparqlTerm = (term: Term): string => {
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal': {
      const text = `"${term.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
      return term.language ? `${text}@${term.language}` : term.datatype ? `${text}^^<${term.datatype}>` : text;
    }
  }
};

type PredicateStats = { iri: string; quads: Quad[]; kinds: Set<ObjectKind> };

export type GeneratedQuery = { id: string; shape: string; sparql: string };

/** Generates `count` queries from `seed`; the same inputs always yield the same queries. */
export const generateQueries = (dataset: readonly Quad[], seed: number, count: number): GeneratedQuery[] => {
  const random = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const triples = dataset.filter((quad) => !quad.g);
  const bySubject = new Map<string, Quad[]>();
  const predicates = new Map<string, PredicateStats>();
  for (const quad of triples) {
    if (quad.s.termType === 'NamedNode') {
      bySubject.set(quad.s.value, [...(bySubject.get(quad.s.value) ?? []), quad]);
    }
    const stats = predicates.get(quad.p.value) ?? { iri: quad.p.value, quads: [], kinds: new Set<ObjectKind>() };
    stats.quads.push(quad);
    stats.kinds.add(kindOf(quad.o));
    predicates.set(quad.p.value, stats);
  }
  const all = [...predicates.values()];
  const homogeneous = (kind: ObjectKind) => all.filter((stats) => stats.kinds.size === 1 && stats.kinds.has(kind));
  const linking = triples.filter((quad) => quad.o.termType === 'NamedNode' && bySubject.has(quad.o.value));
  const subjectsWithTwo = [...bySubject.values()].filter(
    (quads) => new Set(quads.map((quad) => quad.p.value)).size > 1,
  );
  const words = triples
    .filter((quad) => kindOf(quad.o) === 'str' || kindOf(quad.o) === 'lang')
    .flatMap((quad) => quad.o.value.split(/\W+/).filter((word) => word.length > 3))
    .slice(0, 5000);
  const p = (stats: PredicateStats) => `<${stats.iri}>`;

  const shapes: Record<string, () => string | undefined> = {
    star: () => {
      const quads = pick(subjectsWithTwo);
      if (!quads) {
        return undefined;
      }
      const [first, second] = [pick(quads), pick(quads)];
      return `SELECT * WHERE { ?s <${first.p.value}> ?a ; <${second.p.value}> ?b . ?s <${first.p.value}> ${sparqlTerm(first.o)} }`;
    },
    chain: () => {
      const link = pick(linking);
      const next = link && pick(bySubject.get(link.o.value) ?? []);
      return link && next
        ? `SELECT ?a ?c WHERE { ?a <${link.p.value}> ?b . ?b <${next.p.value}> ?c . ?a <${link.p.value}> <${link.o.value}> }`
        : undefined;
    },
    optional: () => {
      const quads = pick(subjectsWithTwo);
      const other = pick(all);
      return quads
        ? `SELECT * WHERE { ?s <${quads[0].p.value}> ${sparqlTerm(quads[0].o)} OPTIONAL { ?s <${other.iri}> ?o } }`
        : undefined;
    },
    optionalFilter: () => {
      const stats = pick(homogeneous('num'));
      const quad = stats && pick(stats.quads);
      const anchor = quad && pick(bySubject.get(quad.s.value) ?? []);
      return anchor
        ? `SELECT * WHERE { ?s <${anchor.p.value}> ?x OPTIONAL { ?s ${p(stats)} ?n FILTER(?n >= ${quad.o.value}) } }`
        : undefined;
    },
    numericFilter: () => {
      const stats = pick(homogeneous('num'));
      const quad = stats && pick(stats.quads);
      const op = pick(['<', '<=', '=', '!=', '>', '>=']);
      return quad ? `SELECT ?s ?n WHERE { ?s ${p(stats)} ?n FILTER(?n ${op} ${quad.o.value}) }` : undefined;
    },
    arithmetic: () => {
      const stats = pick(homogeneous('num'));
      return stats ? `SELECT ?s ?v WHERE { ?s ${p(stats)} ?n BIND(?n * 2 + 1 AS ?v) FILTER(?v > 10) }` : undefined;
    },
    stringFilter: () => {
      const stats = pick([...homogeneous('str'), ...homogeneous('lang')]);
      const word = pick(words);
      if (!stats || !word) {
        return undefined;
      }
      const filter = pick([
        `CONTAINS(LCASE(STR(?o)), "${word.toLowerCase()}")`,
        `STRSTARTS(STR(?o), "${word.slice(0, 3)}")`,
        `STRENDS(STR(?o), "${word.slice(-2)}")`,
        `REGEX(STR(?o), "^${word.slice(0, 2)}", "i")`,
        `STRLEN(STR(?o)) > ${word.length * 3}`,
      ]);
      return `SELECT ?s ?o WHERE { ?s ${p(stats)} ?o FILTER(${filter}) }`;
    },
    langFilter: () => {
      const stats = pick(homogeneous('lang'));
      return stats
        ? `SELECT ?s ?o WHERE { ?s ${p(stats)} ?o FILTER(langMatches(lang(?o), "${pick(['en', '*', 'en-US', 'de'])}")) }`
        : undefined;
    },
    termTests: () => {
      const stats = pick(all);
      const test = pick(['isIRI(?o)', 'isLiteral(?o)', 'isNumeric(?o)', 'isBlank(?o)', '!isIRI(?o)']);
      return `SELECT ?s ?o WHERE { ?s <${stats.iri}> ?o FILTER(${test}) }`;
    },
    union: () => {
      const [left, right] = [pick(all), pick(all)];
      return `SELECT ?s ?o WHERE { { ?s <${left.iri}> ?o } UNION { ?s <${right.iri}> ?o } }`;
    },
    minus: () => {
      const [left, right] = [pick(all), pick(all)];
      return `SELECT ?s WHERE { ?s <${left.iri}> ?o MINUS { ?s <${right.iri}> ?x } }`;
    },
    notExists: () => {
      const [left, right] = [pick(all), pick(all)];
      return `SELECT ?s ?o WHERE { ?s <${left.iri}> ?o FILTER NOT EXISTS { ?s <${right.iri}> ?x } }`;
    },
    groupCount: () => {
      const stats = pick(all);
      return pick([
        `SELECT ?p (COUNT(*) AS ?n) WHERE { ?s ?p ?o } GROUP BY ?p`,
        `SELECT ?o (COUNT(DISTINCT ?s) AS ?n) WHERE { ?s <${stats.iri}> ?o } GROUP BY ?o HAVING (COUNT(?s) > 1)`,
        `SELECT (COUNT(DISTINCT ?o) AS ?n) (COUNT(?o) AS ?m) WHERE { ?s <${stats.iri}> ?o }`,
      ]);
    },
    numericAggregate: () => {
      const stats = pick(homogeneous('num'));
      const group = pick(all);
      return stats
        ? `SELECT ?g (MIN(?n) AS ?min) (MAX(?n) AS ?max) (SUM(?n) AS ?sum) (AVG(?n) AS ?avg) WHERE { ?s ${p(stats)} ?n OPTIONAL { ?s <${group.iri}> ?g } } GROUP BY ?g`
        : undefined;
    },
    termAggregate: () => {
      const stats = pick(all);
      return `SELECT (MIN(?o) AS ?min) (MAX(?o) AS ?max) WHERE { ?s <${stats.iri}> ?o }`;
    },
    orderLimit: () => {
      const kind = pick<ObjectKind>(['num', 'str', 'iri', 'date']);
      const stats = pick(homogeneous(kind));
      return stats
        ? `SELECT DISTINCT ?o WHERE { ?s ${p(stats)} ?o } ORDER BY ${pick(['?o', 'DESC(?o)'])} LIMIT ${1 + Math.floor(random() * 10)} OFFSET ${Math.floor(random() * 3)}`
        : undefined;
    },
    pathPlus: () => {
      const link = pick(linking);
      return link ? `SELECT ?x WHERE { <${link.s.value}> <${link.p.value}>${pick(['+', '*', '?'])} ?x }` : undefined;
    },
    pathInverse: () => {
      const link = pick(linking);
      return link ? `SELECT ?x WHERE { <${link.o.value}> ^<${link.p.value}>/<${link.p.value}> ?x }` : undefined;
    },
    pathAlternative: () => {
      const quads = pick(subjectsWithTwo);
      return quads
        ? `SELECT ?x WHERE { <${quads[0].s.value}> (<${quads[0].p.value}>|<${pick(quads).p.value}>) ?x }`
        : undefined;
    },
    valuesBind: () => {
      const quads = [pick(triples), pick(triples)];
      return `SELECT ?s ?o ?len WHERE { VALUES ?s { ${quads.map((quad) => sparqlTerm(quad.s)).join(' ')} } ?s <${quads[0].p.value}> ?o BIND(STRLEN(STR(?o)) AS ?len) }`;
    },
    distinctProjection: () => {
      const stats = pick(all);
      return `SELECT DISTINCT ?o WHERE { ?s <${stats.iri}> ?o }`;
    },
    subselect: () => {
      const [left, right] = [pick(all), pick(all)];
      return `SELECT ?s ?n WHERE { ?s <${left.iri}> ?x { SELECT ?s (COUNT(?y) AS ?n) WHERE { ?s <${right.iri}> ?y } GROUP BY ?s } }`;
    },
    ask: () => {
      const quad = pick(triples);
      return `ASK { ${sparqlTerm(quad.s)} <${quad.p.value}> ?o FILTER(?o = ${sparqlTerm(quad.o)}) }`;
    },
    construct: () => {
      const stats = pick(all);
      return `CONSTRUCT { ?o <urn:inverse> ?s } WHERE { ?s <${stats.iri}> ?o FILTER(isIRI(?o)) }`;
    },
  };

  const names = Object.keys(shapes);
  const queries: GeneratedQuery[] = [];
  for (let attempt = 0; queries.length < count && attempt < count * 10; attempt++) {
    const shape = names[attempt % names.length];
    const sparql = shapes[shape]();
    if (sparql) {
      queries.push({ id: `gen-${seed}-${String(queries.length).padStart(4, '0')}-${shape}`, shape, sparql });
    }
  }
  return queries;
};
