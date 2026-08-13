//
// Copyright 2026 DXOS.org
//

/**
 * Topological ordering for contributed feed processors. Pure and ECHO-free so the ordering rules are
 * testable on their own — the cascade supplies the nodes, this decides what runs and in what order.
 */

/** The ordering contract a processor declares. */
export type Node = {
  /** Stable id: the topology key, and the tag its feed cursor carries. */
  readonly id: string;
  /** Ids this node must run after. */
  readonly after?: readonly string[];
};

/** A node excluded from the run, and why — never dropped silently. */
export type Excluded<T> = {
  readonly node: T;
  readonly reason: string;
};

export type Sorted<T> = {
  /** Nodes in run order. */
  readonly ordered: readonly T[];
  /** Nodes that cannot run, each with a reportable reason. */
  readonly excluded: readonly Excluded<T>[];
};

/**
 * Orders processors by their declared dependencies, excluding rather than failing on a bad graph.
 *
 * Three rules, all chosen so one bad contributor cannot break everyone else's run — the same
 * principle as treating an unprovided service as a skip rather than a fault:
 *
 * - **Unknown `after` ids are ignored.** Naming a processor whose plugin is not installed is the
 *   normal case for an optional dependency, not an error.
 * - **Duplicate ids: the first contribution wins**, later ones are excluded. Ids are also cursor
 *   tags, so two processors sharing one would share a watermark and silently skip each other's work.
 * - **A cycle excludes only its members.** Everything not caught in it still runs, and each member is
 *   reported by name so the offending contributor is identifiable.
 *
 * Ties are broken by contribution order, so the same set of processors always produces the same run
 * order — a topology that reshuffles between runs would make cursor behaviour irreproducible.
 */
export const sort = <T extends Node>(nodes: readonly T[]): Sorted<T> => {
  const excluded: Excluded<T>[] = [];

  const unique: T[] = [];
  const byId = new Map<string, T>();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      excluded.push({ node, reason: `duplicate processor id '${node.id}'` });
      continue;
    }
    byId.set(node.id, node);
    unique.push(node);
  }

  // Only edges to nodes present in this run: an absent dependency constrains nothing.
  const dependencies = new Map<string, string[]>(
    unique.map((node) => [node.id, (node.after ?? []).filter((id) => byId.has(id) && id !== node.id)]),
  );

  const ordered: T[] = [];
  const placed = new Set<string>();
  // Kahn's algorithm over the input order rather than a queue, so ties resolve to contribution order.
  let progress = true;
  while (progress) {
    progress = false;
    for (const node of unique) {
      if (placed.has(node.id)) {
        continue;
      }
      if (dependencies.get(node.id)?.every((id) => placed.has(id))) {
        ordered.push(node);
        placed.add(node.id);
        progress = true;
      }
    }
  }

  // Whatever could never be placed is exactly the set reachable from a cycle. Naming the whole set in
  // each reason is deliberate: a cycle has no single culprit, so reporting one member tells nobody
  // which contribution to change.
  const stuck = unique.filter((node) => !placed.has(node.id));
  if (stuck.length > 0) {
    const reason = `dependency cycle among [${stuck.map((node) => node.id).join(', ')}]`;
    excluded.push(...stuck.map((node) => ({ node, reason })));
  }

  return { ordered, excluded };
};
