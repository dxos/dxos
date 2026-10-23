//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type CodeGraph } from '#types';

import * as Iri from './Iri.ts';

/**
 * Names for the classes the index's rules conclude on symbols, most specific first: a symbol in several classes
 * (an `OperationHandler` that is also a `PluginModule`) is shown as the first one listed.
 */
const CLASS_NAMES: readonly [string, string][] = [
  ['EffectService', 'service'],
  ['EffectLayerFactory', 'layer factory'],
  ['EffectLayer', 'layer'],
  ['Capability', 'capability'],
  ['Operation', 'operation'],
  ['OperationHandlerSet', 'handler set'],
  ['OperationHandler', 'operation handler'],
  ['EchoType', 'ECHO type'],
  ['EchoRelation', 'ECHO relation'],
  ['DomainError', 'error'],
  ['Skill', 'skill'],
  ['Rpc', 'RPC'],
  ['LazyPlugin', 'plugin'],
  ['Plugin', 'plugin'],
  ['PluginMeta', 'plugin meta'],
  ['PluginModule', 'plugin module'],
  ['Schema', 'schema'],
];

/** Classes that say only what the resource is structurally, which the coarse kind already says. */
const STRUCTURAL = new Set(['Symbol', 'File', 'Package', 'Member']);

/** `EchoType` → `echo type`, for a class the table does not name yet. */
const spaced = (name: string): string => name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/**
 * What to call a resource under its name: the most specific class the index puts it in (`capability`, `service`),
 * else its declaration kind (`function`, `class`), else its coarse kind (`file`, `package`).
 */
export const describe = ({
  types = [],
  kind,
  coarse,
}: {
  /** `rdf:type` objects, as full IRIs or `deus:` CURIEs. */
  types?: readonly string[];
  /** The `deus:kind` literal. */
  kind?: string;
  coarse: CodeGraph.NodeKind;
}): string => {
  const classes = new Set(types.map(Iri.localName));
  const named = CLASS_NAMES.find(([name]) => classes.has(name));
  if (named) {
    return named[1];
  }
  const other = [...classes].find((name) => !STRUCTURAL.has(name));
  if (other) {
    return spaced(other);
  }
  return kind && kind !== 'unknown' ? kind : coarse;
};

/** The title of a box: a symbol's own name, whatever label a query gave it; otherwise the stored label. */
export const titleOf = (node: Pick<CodeGraph.Node, 'id' | 'kind' | 'label'>): string =>
  node.kind === 'symbol' ? Iri.labelOf(node.id) : node.label;

/** IRIs a SPARQL `<…>` term can hold as written. */
const isSafeIri = (iri: string): boolean => Iri.isIri(iri) && !/[\s<>"{}|\\^`]/.test(iri);

/** One SELECT for the classes and declaration kind of every resource, so a graph needs one round trip. */
export const query = (iris: readonly string[]): string | undefined => {
  const terms = [...new Set(iris)].filter(isSafeIri).map((iri) => `<${iri}>`);
  if (terms.length === 0) {
    return undefined;
  }
  return [
    'SELECT ?s ?type ?kind WHERE {',
    `  VALUES ?s { ${terms.join(' ')} }`,
    '  OPTIONAL { ?s a ?type }',
    '  OPTIONAL { ?s deus:kind ?kind }',
    '}',
  ].join('\n');
};

/** The rows of {@link query}, folded into one description per resource. */
export const fromRows = (
  nodes: readonly Pick<CodeGraph.Node, 'id' | 'kind'>[],
  rows: readonly Record<string, string>[],
): Record<string, string> => {
  const facts = new Map<string, { types: string[]; kind?: string }>();
  for (const row of rows) {
    if (!row.s) {
      continue;
    }
    const entry = facts.get(row.s) ?? { types: [] };
    if (row.type) {
      entry.types.push(row.type);
    }
    entry.kind ??= row.kind;
    facts.set(row.s, entry);
  }
  return Object.fromEntries(nodes.map(({ id, kind }) => [id, describe({ ...facts.get(id), coarse: kind })] as const));
};
