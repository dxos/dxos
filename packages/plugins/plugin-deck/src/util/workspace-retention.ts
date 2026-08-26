//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { DeckSchema } from '#types';

/** How many recently visited workspaces keep their subtree loaded, absent a setting. */
export const DEFAULT_LOADED_WORKSPACES = 2;

/**
 * Below this the workspace being left is still mounted when a collection pass runs, and a node
 * released under a mounted plank renders as not-found until the re-expand lands. Position 0 of
 * `recent` is the workspace being entered and position 1 the one being left, so a limit of two or
 * more can never name either, whenever the pass happens to fire.
 */
const MINIMUM_LOADED = 2;

/**
 * Workspaces whose subtrees the graph may unload: everything past `limit` in visit order.
 *
 * Pinned workspaces (settings, the plugin registry) are exempt. They are small and fixed, and they
 * are the ones a session bounces in and out of, so unloading one is rebuild cost with no saving.
 */
export const evictableWorkspaces = (recent: readonly string[], limit: number): string[] =>
  recent
    .filter((id) => id !== DeckSchema.DEFAULT_DECK_ID && !GraphPath.isPinnedWorkspace(id))
    .slice(Math.max(limit, MINIMUM_LOADED));

/** `recent` with `workspace` moved to the front. */
export const touchWorkspace = (recent: readonly string[], workspace: string): string[] => [
  workspace,
  ...recent.filter((id) => id !== workspace),
];
