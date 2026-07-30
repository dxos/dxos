//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';
import { Path } from '@dxos/react-ui-list';

/**
 * Mirror of the layout's active planks keyed by identity rather than by node id: an object is
 * reachable through several subgraphs (a collection, its type section, the hidden database subtree
 * that card navigation opens), and a plank may address it by a path the tree never shows.
 */
export const activeIdentities = (active: readonly string[]): ReadonlySet<string> =>
  new Set(active.map(GraphPath.getIdentityKey));

/** Whether the node a tree path ends at is one of the layout's active planks. */
export const isPathCurrent = (activeKeys: ReadonlySet<string>, pathString: string): boolean =>
  activeKeys.has(GraphPath.getIdentityKey(Path.last(pathString)));
