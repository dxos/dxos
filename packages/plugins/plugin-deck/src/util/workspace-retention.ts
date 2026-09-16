//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

/** Plank ids an open is still waiting on; their workspaces stay loaded until it lands. */
export const pendingPlanks = Atom.make<readonly string[]>([]).pipe(Atom.keepAlive);

/** Whether two answers name the same workspaces, in any order. */
export const sameWorkspaces = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

export type WorkspaceRetention = {
  /** Ids of the graph root's children. */
  rootChildren: readonly string[];
  activeDeck: string;
  previousDeck: string;
  /** Ids of the planks on screen or pending, which can belong to a workspace other than the active one. */
  active: readonly string[];
};

/** Space workspaces other than the one on screen, the one just left, and any a visible plank belongs to. */
export const evictableWorkspaces = ({
  rootChildren,
  activeDeck,
  previousDeck,
  active,
}: WorkspaceRetention): string[] => {
  const retained = new Set([activeDeck, previousDeck, ...active.map(GraphPath.getWorkspaceFromPath)]);
  return rootChildren.filter((id) => {
    const spaceId = GraphPath.getSpaceIdFromPath(id);
    return spaceId !== undefined && id === GraphPath.getSpacePath(spaceId) && !retained.has(id);
  });
};
