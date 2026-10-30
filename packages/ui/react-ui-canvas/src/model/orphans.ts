//
// Copyright 2026 DXOS.org
//

//
// Orphans (VIEWS.md §7.4): a View record is kept by the node that opens it, an anonymous Object by its Instances, and
// a named Object by the library. A record nothing kept reaches is an orphan, deleted with the edit that orphaned it.
//

import { type Node, type ViewId, isInstanceNode, isViewNode } from '@dxos/scene';

import { type ViewMap } from './store.ts';
import { type View } from './types.ts';

/** The record a node opens: a view node's child View, or an Instance's Object. */
export const openedRecord = (node: Node): ViewId | undefined =>
  isViewNode(node) ? node.scene : isInstanceNode(node) ? node.composite : undefined;

/** Whether a record is kept with no node pointing at it: a named Object is a library entry. */
export const isLibraryEntry = (view: View): boolean => view.kind === 'composite' && view.anonymous !== true;

/** The records reachable from `roots` and the library through the nodes that open them. */
const reachable = (views: ViewMap, roots: Iterable<ViewId>): Set<ViewId> => {
  const seen = new Set<ViewId>();
  const pending = [
    ...roots,
    ...Object.values(views)
      .filter(isLibraryEntry)
      .map((view) => view.id),
  ];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const view = views[id];
    if (!view || seen.has(id)) {
      continue;
    }
    seen.add(id);
    for (const node of Object.values(view.nodes)) {
      const opened = openedRecord(node);
      if (opened !== undefined && !seen.has(opened)) {
        pending.push(opened);
      }
    }
  }
  return seen;
};

/** The records of `views` that nothing kept reaches: Views other than `roots`, and anonymous Objects. */
export const orphanViews = (views: ViewMap, roots: Iterable<ViewId>): Set<ViewId> => {
  const kept = reachable(views, roots);
  return new Set(Object.keys(views).filter((id) => !kept.has(id)));
};

/** `views` without the records `orphanViews` names; the same map when there are none. */
export const withoutOrphans = (views: ViewMap, roots: Iterable<ViewId>): ViewMap => {
  const orphans = orphanViews(views, roots);
  return orphans.size === 0 ? views : Object.fromEntries(Object.entries(views).filter(([id]) => !orphans.has(id)));
};

/**
 * `after` without the records an edit orphaned: those orphaned in `after` that were not already in `before`, so a
 * record some other cause left unreferenced stays until the load-time clean-up. The same map when there are none.
 */
export const pruneOrphaned = (before: ViewMap, after: ViewMap, roots: readonly ViewId[]): ViewMap => {
  const already = orphanViews(before, roots);
  const orphaned = [...orphanViews(after, roots)].filter((id) => !already.has(id));
  return orphaned.length === 0
    ? after
    : Object.fromEntries(Object.entries(after).filter(([id]) => !orphaned.includes(id)));
};
