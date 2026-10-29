//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Tag from '@dxos/react-ui/Tag';

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

/** `EchoType` -> `echo type`, for a class the table does not name yet. */
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

/** IRIs a SPARQL `<...>` term can hold as written. */
const isSafeIri = (iri: string): boolean => Iri.isIri(iri) && !/[\s<>"{}|\\^`]/.test(iri);

/**
 * One SELECT for every resource's classes, declaration kind and package (directory and name), so a graph needs one
 * round trip. A package names itself; a file names its package; a symbol names its file's. Grouped to one row per
 * resource: the package lookups multiply rows, which would otherwise run a large graph into the row cap.
 */
export const query = (iris: readonly string[]): string | undefined => {
  const terms = [...new Set(iris)].filter(isSafeIri).map((iri) => `<${iri}>`);
  if (terms.length === 0) {
    return undefined;
  }
  return [
    'SELECT ?s (GROUP_CONCAT(DISTINCT STR(?type); SEPARATOR=" ") AS ?types)',
    '  (SAMPLE(?kind) AS ?kind) (SAMPLE(?dir) AS ?dir) (SAMPLE(?pkg) AS ?pkg) WHERE {',
    `  VALUES ?s { ${terms.join(' ')} }`,
    '  OPTIONAL { ?s a ?type }',
    '  OPTIONAL { ?s deus:kind ?kind }',
    '  OPTIONAL {',
    '    { ?s deus:packagePath ?dir ; deus:name ?pkg }',
    '    UNION { ?s deus:inPackage ?p . ?p deus:packagePath ?dir ; deus:name ?pkg }',
    '    UNION { ?f deus:declares ?s . ?f deus:inPackage ?p . ?p deus:packagePath ?dir ; deus:name ?pkg }',
    '  }',
    '} GROUP BY ?s',
  ].join('\n');
};

export type Info = {
  /** What each resource is, by IRI. */
  kinds: Record<string, string>;
  /** The package directory each resource belongs to, by IRI; a package box belongs to its own. */
  groups: Record<string, string>;
  /** Package names by directory, for labelling frames. */
  packages: Record<string, string>;
};

/** The rows of {@link query}, folded into one description per resource. */
export const fromRows = (
  nodes: readonly Pick<CodeGraph.Node, 'id' | 'kind'>[],
  rows: readonly Record<string, string>[],
): Info => {
  const facts = new Map<string, { types: string[]; kind?: string }>();
  const groups: Record<string, string> = {};
  const packages: Record<string, string> = {};
  for (const row of rows) {
    if (!row.s) {
      continue;
    }
    const entry = facts.get(row.s) ?? { types: [] };
    entry.types.push(...(row.types ?? row.type ?? '').split(' ').filter(Boolean));
    entry.kind ??= row.kind;
    facts.set(row.s, entry);
    if (row.dir) {
      groups[row.s] ??= row.dir;
      if (row.pkg) {
        packages[row.dir] ??= row.pkg;
      }
    }
  }
  return {
    kinds: Object.fromEntries(nodes.map(({ id, kind }) => [id, describe({ ...facts.get(id), coarse: kind })] as const)),
    groups,
    packages,
  };
};

/** A hue per kind, so boxes of one kind read as a set; related kinds share a family (layers, operations, plugins). */
const HUES: Record<string, Tag.TagHue> = {
  'service': 'yellow',
  'layer': 'lime',
  'layer factory': 'lime',
  'capability': 'indigo',
  'operation': 'orange',
  'operation handler': 'amber',
  'handler set': 'amber',
  'ECHO type': 'sky',
  'ECHO relation': 'sky',
  'error': 'red',
  'skill': 'fuchsia',
  'RPC': 'teal',
  'plugin': 'purple',
  'plugin meta': 'purple',
  'plugin module': 'violet',
  'schema': 'blue',
  'function': 'emerald',
  'class': 'pink',
  'type': 'cyan',
  'interface': 'cyan',
  'enum': 'cyan',
  'package': 'rose',
  'module': 'violet',
  'spec': 'green',
};

/** The hue a kind is drawn in; kinds without one of their own are neutral. */
export const hueOf = (kind: string): Tag.TagHue => HUES[kind] ?? 'neutral';
