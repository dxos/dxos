//
// Copyright 2026 DXOS.org
//

import { RDF, type SparqlRow, type SparqlTerm } from '@dxos/pipeline-rdf';

/** A prefixed name's local part, as SPARQL's PN_LOCAL allows it without escapes (kept conservative). */
const LOCAL_NAME = /^[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/;

/** Graphs the store mints entities in; an entity IRI local to one reads as `g1:alice` rather than its full IRI. */
const isGraphNamespace = (base: string): boolean => base.startsWith(RDF.Vocab.GRAPH) || base.startsWith(RDF.Vocab.FACT);

/** A literal in Turtle syntax, its datatype or language tag written with `datatype`. */
const literal = (value: Extract<SparqlTerm, { termType: 'Literal' }>, datatype: (iri: string) => string): string =>
  `${JSON.stringify(value.value)}${value.language ? `@${value.language}` : value.datatype ? `^^${datatype(value.datatype)}` : ''}`;

/**
 * SPARQL solutions as a `VALUES` block, which is valid SPARQL and so reads (and highlights) as the query language:
 * the `PREFIX`es it uses, then one parenthesised row per solution, `UNDEF` where a variable is unbound. IRIs shorten
 * by the store's prefixes, the brain's namespace as `brain:`, and each graph's local entities as `g1:`, `g2:`, ….
 *
 * `VALUES` cannot hold a blank node, so solutions that bind one are written in the SPARQL 1.1 TSV results format
 * instead: a `?a\t?b` header, then one tab-separated line per solution with full `<IRI>`s (TSV declares no prefixes),
 * blank nodes as `_:label` (keeping their identity across rows) and an empty field where a variable is unbound.
 */
export const formatBindings = (
  rows: readonly SparqlRow[],
  options: { variables?: readonly string[]; namespace?: string } = {},
): string => {
  const variables = options.variables ?? [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (rows.some((row) => Object.values(row).some((value) => value.termType === 'BlankNode'))) {
    return formatTsv(rows, variables);
  }
  const prefixes = new Map<string, string>([
    ...Object.entries(RDF.Graph.PREFIXES),
    ...(options.namespace ? [['brain', options.namespace] as const] : []),
  ]);
  const used = new Map<string, string>();
  const graphs = new Map<string, string>();

  const iri = (value: string): string => {
    const hash = value.lastIndexOf('#');
    if (hash > 0 && isGraphNamespace(value.slice(0, hash))) {
      const base = value.slice(0, hash + 1);
      let prefix = graphs.get(base);
      if (!prefix) {
        prefix = `g${graphs.size + 1}`;
        graphs.set(base, prefix);
      }
      const local = value.slice(hash + 1);
      if (LOCAL_NAME.test(local)) {
        used.set(prefix, base);
        return `${prefix}:${local}`;
      }
    }
    const [prefix, base] =
      [...prefixes]
        .filter(([, candidate]) => value.startsWith(candidate))
        .sort(([, left], [, right]) => right.length - left.length)[0] ?? [];
    const local = base !== undefined ? value.slice(base.length) : undefined;
    if (prefix !== undefined && base !== undefined && local !== undefined && LOCAL_NAME.test(local)) {
      used.set(prefix, base);
      return `${prefix}:${local}`;
    }
    return `<${value}>`;
  };

  const term = (value: SparqlTerm | undefined): string => {
    if (!value) {
      return 'UNDEF';
    }
    switch (value.termType) {
      case 'NamedNode':
        return iri(value.value);
      case 'BlankNode':
        return `_:${value.value}`;
      case 'Literal':
        return literal(value, iri);
    }
  };

  const body = rows.map((row) => `  (${variables.map((variable) => term(row[variable])).join(' ')})`);
  const head = [...used].map(([prefix, base]) => `PREFIX ${prefix}: <${base}>`);
  return [
    ...head,
    ...(head.length > 0 ? [''] : []),
    `VALUES (${variables.map((variable) => `?${variable}`).join(' ')}) {`,
    ...body,
    '}',
  ].join('\n');
};

/** Solutions in the SPARQL 1.1 TSV results format. */
const formatTsv = (rows: readonly SparqlRow[], variables: readonly string[]): string => {
  const iri = (value: string): string => `<${value}>`;
  const term = (value: SparqlTerm | undefined): string => {
    if (!value) {
      return '';
    }
    switch (value.termType) {
      case 'NamedNode':
        return iri(value.value);
      case 'BlankNode':
        return `_:${value.value}`;
      case 'Literal':
        return literal(value, iri);
    }
  };
  return [
    variables.map((variable) => `?${variable}`).join('\t'),
    ...rows.map((row) => variables.map((variable) => term(row[variable])).join('\t')),
  ].join('\n');
};
