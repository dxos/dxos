//
// Copyright 2026 DXOS.org
//

import { type PathResolution } from '@dxos/app-graph';
import { UrlPath } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

/** Reverse-mapped `(key, id?, workspace)` representation of every plank id worth serializing. */
export type Representations = ReadonlyMap<string, PathResolution.RepresentedNode>;

/**
 * Pure serialization of a deck's `active` plank list into a pathname under the pair-chain grammar — the
 * reverse of `PathResolution.resolveUrl`. Extracted as a pure function (taking pre-computed
 * representations rather than a live graph builder) so it is testable without an Effect runtime. A plank
 * with no representation (an unmapped node, or the not-found sentinel) is skipped with a `log.warn`, per
 * the design's "unmapped nodes" rule.
 *
 * Every plank serializes the same way, popped companions included: the caller represents a companion
 * plank as a self-contained `companion/<source>~<variant>` pair, so the chain reads as the deck's
 * contents in order. `context` trails the chain — it is the sidebar's selection, not deck content.
 */
export const serializeDeckToUrl = (params: {
  workspace: string;
  /** The declared workspace-anchor key (conventionally `w`); see `PathResolution.getAnchorKey`. */
  workspaceKey: string;
  active: readonly string[];
  representations: Representations;
  /** The complementary sidebar's selected panel, already encoded. */
  context?: string;
}): string => {
  const { workspace, workspaceKey, active, representations, context } = params;

  const pairs: UrlPath.Pair[] = [];
  for (const id of active) {
    const rep = representations.get(id);
    if (!rep) {
      log.warn('plank has no URL representation; omitting from URL', { id });
      continue;
    }
    pairs.push({ key: rep.key, id: rep.id, workspace: rep.workspace });
  }

  if (context) {
    pairs.push({ key: UrlPath.CONTEXT_KEY, id: context, workspace });
  }

  return UrlPath.format({ workspace, workspaceKey, pairs });
};
