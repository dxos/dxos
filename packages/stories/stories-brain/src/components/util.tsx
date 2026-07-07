//
// Copyright 2026 DXOS.org
//

import { type FactGraph, type Type } from '@dxos/pipeline-rdf';
import { type TreeNode } from '@dxos/react-ui-graph';
import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

export type Group = {
  subject: string;
  facts: Type.Fact[];
  conflicted: boolean;
  conflictedIds: Set<string>;
};

/** Group facts by subject entity and flag predicate-level conflicts within each group. */
export const groupFacts = (facts: Type.Fact[], filter: string): Group[] => {
  const needle = filter.trim().toLowerCase();
  const filtered = needle
    ? facts.filter((fact) => {
        const { subject, predicate, object } = fact.assertion;
        return [formatTerm(subject), predicate, formatTerm(object)].some((value) =>
          value.toLowerCase().includes(needle),
        );
      })
    : facts;

  // Group by the entity slug (so `DXOS`/`dxos` collapse) but remember a display label for the header.
  const bySubject = new Map<string, Type.Fact[]>();
  const labelByKey = new Map<string, string>();
  for (const fact of filtered) {
    const key = termKey(fact.assertion.subject);
    const list = bySubject.get(key) ?? [];
    list.push(fact);
    bySubject.set(key, list);
    if (!labelByKey.has(key)) {
      labelByKey.set(key, formatTerm(fact.assertion.subject));
    }
  }

  return [...bySubject.entries()].map(([key, groupFactsList]) => {
    const subject = labelByKey.get(key) ?? key;
    const byPredicate = new Map<string, Type.Fact[]>();
    for (const fact of groupFactsList) {
      const list = byPredicate.get(fact.assertion.predicate) ?? [];
      list.push(fact);
      byPredicate.set(fact.assertion.predicate, list);
    }

    const conflictedIds = new Set<string>();
    for (const list of byPredicate.values()) {
      const objects = new Set(list.map((fact) => termKey(fact.assertion.object)));
      if (objects.size > 1) {
        for (const fact of list) {
          conflictedIds.add(fact.id);
        }
      }
    }

    return {
      subject,
      facts: groupFactsList,
      conflicted: conflictedIds.size > 0,
      conflictedIds,
    };
  });
};

/** The join/grouping key: the entity slug (or literal). Casing variants collapse to one key. */
export const termKey = (term: Type.Term): string => ('entity' in term ? term.entity : term.literal);

/** Display form: the preserved surface label, else a prettified slug; literals render verbatim. */
export const formatTerm = (term: Type.Term): string =>
  'entity' in term ? (term.label ?? humanize(term.entity)) : term.literal;

export type EntityItem = {
  /** Entity id (slug) — the context key for filtering / graph rooting. */
  id: string;
  label: string;
  /** Number of facts the entity appears in (as subject or object). */
  count: number;
};

/**
 * Distinct entities mentioned across the facts (subject + object entity terms), deduped by id with a
 * display label and occurrence count, busiest first. Literal terms are not entities and are skipped.
 */
export const entitiesFromFacts = (facts: Type.Fact[]): EntityItem[] => {
  const byId = new Map<string, EntityItem>();
  const add = (term: Type.Term) => {
    if (!('entity' in term)) {
      return;
    }
    const existing = byId.get(term.entity);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(term.entity, { id: term.entity, label: formatTerm(term), count: 1 });
    }
  };
  for (const fact of facts) {
    add(fact.assertion.subject);
    add(fact.assertion.object);
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/**
 * Convert a {@link FactGraph} into a rooted {@link TreeNode} hierarchy for the tidy-tree renderer.
 * A fact graph is a general (cyclic) graph; the tidy tree needs a hierarchy, so this takes the BFS
 * spanning tree from `rootId` over the undirected edges (each node appears once). Returns `undefined`
 * if the root isn't in the graph.
 */
export const graphToTreeNode = (graph: FactGraph, rootId: string): TreeNode | undefined => {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodeById.has(rootId)) {
    return undefined;
  }
  const adjacency = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  };
  for (const edge of graph.edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  const visited = new Set<string>([rootId]);
  const build = (id: string): TreeNode => {
    const children: TreeNode[] = [];
    for (const neighbour of adjacency.get(id) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        children.push(build(neighbour));
      }
    }
    return { id, label: nodeById.get(id)?.label ?? id, ...(children.length > 0 ? { children } : {}) };
  };
  return build(rootId);
};

/** Render ids like `q3-board-meeting` as `Q3 Board Meeting`. */
export const humanize = (value: string): string =>
  value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const formatDate = (iso: string): string => iso.slice(0, 10);

/** Map FactBank factuality to a real react-ui palette member. */
export const factualityColor = (factuality: Type.Factuality): NeutralPalette | ChromaticPalette | MessageValence => {
  switch (factuality) {
    case 'CT+':
      return 'emerald';
    case 'PR+':
      return 'amber';
    case 'PS+':
      return 'sky';
    case 'CT-':
    case 'PR-':
    case 'PS-':
      return 'red';
    case 'CTu':
    case 'Uu':
    default:
      return 'neutral';
  }
};
