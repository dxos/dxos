//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

export type WorkspaceRetention = {
  /** Ids of the graph root's children. */
  rootChildren: readonly string[];
  activeDeck: string;
  previousDeck: string;
  /** Ids of the planks on screen, which can belong to a workspace other than the active one. */
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
