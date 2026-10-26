//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type CodeGraph } from '#types';

import * as Iri from './Iri.ts';

/** Separates an arrow id's ends; IRIs cannot contain `>`, so an id splits back unambiguously. */
export const EDGE_SEPARATOR = '->';

export const edgeId = ({ from, to }: Pick<CodeGraph.Edge, 'from' | 'to'>): string => `${from}${EDGE_SEPARATOR}${to}`;

/** A box for an IRI, labelled and grouped from the IRI alone unless the caller knows better. */
export const makeNode = (iri: string, props: Partial<Omit<CodeGraph.Node, 'id'>> = {}): CodeGraph.Node => {
  const id = Iri.expand(iri);
  return {
    id,
    label: props.label ?? Iri.labelOf(id),
    kind: props.kind ?? Iri.kindOf(id),
    ...((props.group ?? Iri.groupOf(id)) !== undefined && { group: props.group ?? Iri.groupOf(id) }),
    ...(props.position && { position: props.position }),
  };
};

export type Patch = {
  nodes: CodeGraph.Node[];
  edges: CodeGraph.Edge[];
};

/**
 * The boxes and arrows in `patch` that `current` lacks; a box already shown keeps its position, and a box
 * an arrow needs is added for it.
 */
export const missing = (current: Patch, patch: Patch): Patch => {
  const known = new Set(current.nodes.map(({ id }) => id));
  const nodes: CodeGraph.Node[] = [];
  const add = (node: CodeGraph.Node) => {
    if (!known.has(node.id)) {
      known.add(node.id);
      nodes.push(node);
    }
  };
  patch.nodes.forEach(add);
  const linked = new Set(current.edges.map(edgeId));
  const edges: CodeGraph.Edge[] = [];
  for (const edge of patch.edges) {
    if (edge.from === edge.to || linked.has(edgeId(edge))) {
      continue;
    }
    linked.add(edgeId(edge));
    add(makeNode(edge.from));
    add(makeNode(edge.to));
    edges.push(edge);
  }
  return { nodes, edges };
};

/** The graph without the given boxes and every arrow touching them. */
export const without = (current: Patch, ids: readonly string[]): Patch => {
  const removed = new Set(ids.map(Iri.expand));
  return {
    nodes: current.nodes.filter(({ id }) => !removed.has(id)),
    edges: current.edges.filter(({ from, to }) => !removed.has(from) && !removed.has(to)),
  };
};

/**
 * Turns SPARQL rows into boxes and arrows: `?from`/`?to` (or `?source`/`?target`) make an arrow, `?node` (or any
 * lone IRI column) makes a box, and `?label`, `?fromLabel`, `?toLabel`, `?kind` and `?group` override the defaults.
 */
export const fromRows = (rows: readonly Record<string, string>[], predicate?: string): Patch => {
  const nodes: CodeGraph.Node[] = [];
  const edges: CodeGraph.Edge[] = [];
  for (const row of rows) {
    const from = row.from ?? row.source;
    const to = row.to ?? row.target;
    if (from && to && Iri.isIri(from) && Iri.isIri(to)) {
      nodes.push(makeNode(from, { label: row.fromLabel }), makeNode(to, { label: row.toLabel }));
      const kind = row.predicate ? Iri.localName(row.predicate) : (row.edgeKind ?? predicate);
      edges.push({ from, to, ...(kind && { kind }) });
      continue;
    }
    const node = row.node ?? Object.values(row).find(Iri.isIri);
    if (node && Iri.isIri(node)) {
      nodes.push(
        makeNode(node, {
          label: row.label,
          ...(row.group && { group: row.group }),
        }),
      );
    }
  }
  return { nodes, edges };
};
