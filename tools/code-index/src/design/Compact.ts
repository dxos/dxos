//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Graph from './Graph.ts';
import * as Zoom from './Zoom.ts';

/**
 * The answer diagram's content, built from the scored subgraph with no layout involved: which ≲ 14
 * nodes, which ≤ 3 groups, which arrows. Several variants are produced from the same scores because
 * the judges, not this module, decide which reads best; the drawing stage lays each out and keeps one.
 *
 * The limits are the corpus lessons (`plugin-illustrator/docs/diagrams/ideas/README.md`): about 14
 * nodes and three groups before crossings climb, labels short enough to sit on one line, and no
 * caption, because a caption biases the judge.
 */

export const MAX_NODES = 14;

export const MAX_GROUPS = 3;

/** The fewest boxes a diagram is topped up to when zoom kept fewer. */
export const MIN_NODES = 6;

/** The SVG draws a label on one line in a fixed-width box; past this it spills over both edges. */
export const MAX_LABEL = 17;

export type Variant = {
  readonly name: string;
  readonly grouping: Graph.Grouping;
  readonly nodes: number;
  /** `semantic` drops plain imports wherever a framework relation (service, operation, …) says more. */
  readonly edges: 'all' | 'semantic';
};

export type Node = {
  readonly id: string;
  readonly label: string;
  readonly iri: string;
  readonly path: string;
  readonly group?: string;
  readonly score: number;
};

export type Arrow = { readonly from: string; readonly to: string; readonly label?: string; readonly kind: string };

export type Diagram = {
  readonly variant: Variant;
  readonly groups: readonly { readonly id: string; readonly label: string }[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Arrow[];
  /** The mermaid source, ending in one `%% ref <id> <path>` per node. */
  readonly mermaid: string;
};

/** The words an edge says, for the kinds worth labelling; imports and relays stay unlabelled. */
const EDGE_LABELS: Record<string, string> = {
  providesService: 'provides',
  requiresService: 'requires',
  layerRequires: 'needs',
  implementsOperation: 'implements',
  contributesCapability: 'contributes',
  extends: 'extends',
};

/** Which of several parallel facts names a pair's arrow: the most specific relation wins. */
const PRECEDENCE = [
  'providesService',
  'implementsOperation',
  'contributesCapability',
  'requiresService',
  'layerRequires',
  'extends',
  'imports',
  'implDependsOn',
  Graph.RELAY,
  'reexports',
  'apiDependsOn',
];

const rank = (kind: string): number => {
  const index = PRECEDENCE.indexOf(kind);
  return index < 0 ? PRECEDENCE.length : index;
};

/** Shortens a label to fit one line, dropping a trailing generic word before truncating. */
export const shortLabel = (label: string): string => {
  if (label.length <= MAX_LABEL) {
    return label;
  }
  const trimmed = label.replace(/(Impl|Service|Manager|Handler|Provider|Layer)$/, '');
  if (trimmed.length <= MAX_LABEL && trimmed.length > 2) {
    return trimmed;
  }
  return `${label.slice(0, MAX_LABEL - 1)}…`;
};

const identifier = (label: string): string => label.replace(/[^A-Za-z0-9]/g, '') || 'n';

/** The group a node falls in at a grouping level. */
export const groupKey = (node: Graph.ScoredNode, grouping: Graph.Grouping): string | undefined => {
  switch (grouping) {
    case 'package':
      return node.package;
    case 'area':
      return node.area;
    case 'directory':
      return `${node.package ?? ''}:${Zoom.directoryOf(node, Zoom.packagePathOf(node.path))}`;
    case 'kind':
      return node.kind;
  }
};

const groupLabel = (key: string, grouping: Graph.Grouping): string => {
  const text = grouping === 'directory' ? (key.split(':')[1] ?? key) : key;
  return text.length > 24 ? `…${text.slice(-23)}` : text;
};

/** The default variant set: the chosen grouping three ways, and one alternative grouping. */
export const variants = (chosen: Graph.Grouping): Variant[] => {
  const alternative: Graph.Grouping = chosen === 'package' ? 'directory' : 'package';
  return [
    { name: `${chosen}-all`, grouping: chosen, nodes: MAX_NODES, edges: 'all' },
    { name: `${chosen}-semantic`, grouping: chosen, nodes: MAX_NODES, edges: 'semantic' },
    { name: `${chosen}-small`, grouping: chosen, nodes: 10, edges: 'all' },
    { name: `${alternative}-all`, grouping: alternative, nodes: MAX_NODES, edges: 'all' },
  ];
};

/** One diagram variant from a scored graph. */
export const build = (scored: Graph.Scored, variant: Variant): Diagram => {
  // The kept set, topped up from the best of the rest: a strict threshold can keep so few nodes that,
  // once boxes without arrows are dropped, nothing is left to draw — and judges score an empty page well.
  const ranked = [...scored.nodes].sort(
    (left, right) => Number(right.kept) - Number(left.kept) || right.score - left.score,
  );
  const keptCount = ranked.filter((node) => node.kept).length;
  const kept = ranked.slice(0, Math.max(keptCount, Math.min(MIN_NODES, variant.nodes, ranked.length)));
  const pool = new Set(kept.map((node) => node.iri));
  const edges = Graph.dedupe(
    scored.edges.filter(
      (edge) =>
        pool.has(edge.from) &&
        pool.has(edge.to) &&
        (edge.kind === Graph.RELAY || (scored.relations[edge.kind] ?? 0) >= 0.5),
    ),
  );

  // A second cut, with the same relay rule: a kept node that does not make the diagram still
  // carries the arrows that ran through it.
  const { kept: chosen, edges: cut } = Graph.prune(kept, edges, { threshold: 0, budget: variant.nodes });

  // One arrow per ordered pair, named by its most specific relation.
  const pairs = new Map<string, Graph.Edge>();
  for (const edge of cut) {
    const key = `${edge.from}\u0000${edge.to}`;
    const existing = pairs.get(key);
    if (!existing || rank(edge.kind) < rank(existing.kind)) {
      pairs.set(key, edge);
    }
  }
  let arrows = [...pairs.values()];
  if (variant.edges === 'semantic') {
    const semantic = arrows.filter((edge) => edge.kind in EDGE_LABELS);
    if (semantic.length >= 3) {
      // Keep an import only where it is a node's sole connection, so nothing is orphaned.
      const touched = new Set(semantic.flatMap((edge) => [edge.from, edge.to]));
      arrows = [
        ...semantic,
        ...arrows.filter((edge) => !(edge.kind in EDGE_LABELS) && (!touched.has(edge.from) || !touched.has(edge.to))),
      ];
    }
  }

  // A box with no arrow says nothing about how the parts fit; drop it unless the diagram would empty.
  const connected = new Set(arrows.flatMap((edge) => [edge.from, edge.to]));
  const members = kept.filter((node) => chosen.has(node.iri) && (connected.has(node.iri) || connected.size < 4));

  const counts = new Map<string, number>();
  for (const node of members) {
    const key = groupKey(node, variant.grouping);
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const groupKeys = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_GROUPS)
    .map(([key]) => key);
  const groups = groupKeys.map((key, index) => ({ id: `g${index}`, label: groupLabel(key, variant.grouping), key }));

  const ids = new Map<string, string>();
  const used = new Set<string>();
  const nodes: Node[] = members.map((node) => {
    // Two boxes reading the same name look like one component drawn twice, so a clash names its package.
    const clash = members.filter((other) => other.label === node.label).length > 1;
    const label = shortLabel(
      clash && node.package ? `${node.package.replace(/^@[^/]+\//, '')}/${node.label}` : node.label,
    );
    let id = identifier(label);
    for (let suffix = 2; used.has(id) || groups.some((group) => group.id === id); suffix++) {
      id = `${identifier(label)}${suffix}`;
    }
    used.add(id);
    ids.set(node.iri, id);
    const key = groupKey(node, variant.grouping);
    const group = groups.find((entry) => entry.key === key)?.id;
    return { id, label, iri: node.iri, path: node.path, score: node.score, ...(group ? { group } : {}) };
  });

  const finalArrows: Arrow[] = arrows.flatMap((edge) => {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    if (from === undefined || to === undefined) {
      return [];
    }
    const label = EDGE_LABELS[edge.kind];
    return [{ from, to, kind: edge.kind, ...(label ? { label } : {}) }];
  });

  return {
    variant,
    groups: groups.map(({ id, label }) => ({ id, label })),
    nodes,
    edges: finalArrows,
    mermaid: toMermaid(groups, nodes, finalArrows),
  };
};

/** Mermaid in the subset `@dxos/diagram` parses: flat subgraphs, `Id[Label]`, `-->` and `-->|label|`. */
export const toMermaid = (
  groups: readonly { id: string; label: string }[],
  nodes: readonly Node[],
  edges: readonly Arrow[],
): string => {
  const quote = (label: string) => label.replace(/[[\]|"]/g, ' ');
  const lines = ['flowchart TB'];
  for (const group of groups) {
    lines.push(`  subgraph ${group.id} [${quote(group.label)}]`);
    for (const node of nodes.filter((entry) => entry.group === group.id)) {
      lines.push(`    ${node.id}[${quote(node.label)}]`);
    }
    lines.push('  end');
  }
  for (const node of nodes.filter((entry) => entry.group === undefined)) {
    lines.push(`  ${node.id}[${quote(node.label)}]`);
  }
  for (const edge of edges) {
    lines.push(edge.label ? `  ${edge.from} -->|${edge.label}| ${edge.to}` : `  ${edge.from} --> ${edge.to}`);
  }
  for (const node of nodes) {
    lines.push(`%% ref ${node.id} ${node.path}`);
  }
  return `${lines.join('\n')}\n`;
};
