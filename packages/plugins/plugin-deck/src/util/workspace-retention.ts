//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

export const pendingPlanks = Atom.make<readonly string[]>([]).pipe(Atom.keepAlive);

export const sameWorkspaces = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

export type WorkspaceRetention = {
  rootChildren: readonly string[];
  activeDeck: string;
  previousDeck: string;
  retainedPlanks: readonly string[];
};

export const evictableWorkspaces = ({
  rootChildren,
  activeDeck,
  previousDeck,
  retainedPlanks,
}: WorkspaceRetention): string[] => {
  const retained = new Set([activeDeck, previousDeck, ...retainedPlanks.map(GraphPath.getWorkspaceFromPath)]);
  return rootChildren.filter((id) => {
    const spaceId = GraphPath.getSpaceIdFromPath(id);
    return spaceId !== undefined && id === GraphPath.getSpacePath(spaceId) && !retained.has(id);
  });
};
