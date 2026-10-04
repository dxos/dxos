//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Ontology from '../Ontology.ts';
import * as Term from '../worker/types/Term.ts';
import * as Terms from './Terms.ts';

/**
 * SPARQL preprocessing shared by every surface that runs model-written queries (the MCP server and
 * the design explorer): missing prefix declarations are added and unknown `deus:` terms are named.
 */

/** The namespaces of `design/ONTOLOGY.md`; a query using one without declaring it gets the declaration. */
export const NAMESPACES: Readonly<Record<string, string>> = {
  deus: Ontology.PREFIX,
  file: Ontology.FILE_BASE,
  pkg: Ontology.PACKAGE_BASE,
  module: Ontology.MODULE_BASE,
  graph: Ontology.GRAPH_BASE,
  type: Ontology.TYPE_BASE,
  lib: Term.LIB_BASE,
  rdf: Ontology.prefixes.rdf,
  rdfs: Ontology.prefixes.rdfs,
  xsd: Ontology.prefixes.xsd,
};

/**
 * The query with string literals, IRIs and comments blanked, so a scan for prefixed names sees only
 * syntax: `"deus:x"` and `<urn:deus:x>` are not uses of the `deus:` prefix.
 */
const syntaxOnly = (sparql: string): string =>
  sparql
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, ' ')
    .replace(/<[^<>"{}|^`\\\s]*>/g, ' ')
    .replace(/#[^\n]*/g, ' ');

/**
 * Prepends a PREFIX declaration for every {@link NAMESPACES} prefix the query uses without
 * declaring, which is the most common reason an agent's first query fails to parse.
 */
export const withPrefixes = (sparql: string): { readonly sparql: string; readonly injected: readonly string[] } => {
  const syntax = syntaxOnly(sparql);
  const declared = new Set([...syntax.matchAll(/PREFIX\s+([A-Za-z][\w.-]*)?\s*:/gi)].map((match) => match[1] ?? ''));
  const used = new Set([...syntax.matchAll(/(?<![\w?$:.-])([A-Za-z][\w-]*):/g)].map((match) => match[1]));
  const injected = [...used].filter((prefix) => !declared.has(prefix) && NAMESPACES[prefix] !== undefined).sort();
  if (injected.length === 0) {
    return { sparql, injected };
  }
  const declarations = injected.map((prefix) => `PREFIX ${prefix}: <${NAMESPACES[prefix]}>`).join('\n');
  return { sparql: `${declarations}\n${sparql}`, injected };
};

/** The `deus:` local names a query mentions, prefixed or as full IRIs. */
export const deusTerms = (sparql: string): string[] => {
  const prefixed = [...syntaxOnly(sparql).matchAll(/(?<![\w?$:.-])deus:([A-Za-z_][\w-]*)/g)].map((match) => match[1]);
  const escaped = Ontology.PREFIX.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const full = [...sparql.matchAll(new RegExp(`<${escaped}([A-Za-z_][\\w-]*)>`, 'g'))].map((match) => match[1]);
  return [...new Set([...prefixed, ...full])];
};

/** A warning per `deus:` term the vocabulary lacks, naming the closest known ones — a typo otherwise returns `[]`. */
export const unknownTermWarnings = (sparql: string, known: ReadonlySet<string>): string[] =>
  deusTerms(sparql)
    .filter((term) => !known.has(term))
    .map((term) => {
      const near = Terms.closest(term, known);
      return near.length > 0
        ? `deus:${term} is not in the vocabulary; did you mean ${near.map((name) => `deus:${name}`).join(', ')}?`
        : `deus:${term} is not in the vocabulary; call \`vocabulary\` for the terms that exist.`;
    });

/**
 * Bounds a SELECT at the store: the backends materialise every row, so an unbounded query against
 * millions of quads must be cut off by the engine, not by slicing afterwards. A trailing LIMIT is
 * lowered to the cap; with none, one is appended on its own line so a trailing comment cannot
 * swallow it.
 */
export const boundQuery = (sparql: string, limit: number): string => {
  const trailing = /((?:\s+(?:LIMIT|OFFSET)\s+\d+)+)\s*$/i.exec(sparql);
  const modifiers = trailing?.[1] ?? '';
  if (!/LIMIT/i.test(modifiers)) {
    return `${sparql}\nLIMIT ${limit}`;
  }
  const lowered = modifiers.replace(/LIMIT\s+(\d+)/i, (_, value: string) => `LIMIT ${Math.min(Number(value), limit)}`);
  return `${sparql.slice(0, trailing?.index ?? sparql.length)}${lowered}`;
};
