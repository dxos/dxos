//
// Copyright 2026 DXOS.org
//

import { type PathResolution } from '@dxos/app-graph';
import { UrlPath } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

/** Reverse-mapped `(key, id?, workspace)` representation of every plank id worth serializing. */
export type Representations = ReadonlyMap<string, PathResolution.RepresentedNode>;

/** The attended plank's open companion, if any, already reverse-mapped. */
export type CompanionRepresentation = {
  /** Id of the plank the companion is attached to (the attended plank at serialization time). */
  attendedId: string;
  node: PathResolution.RepresentedNode;
};

/**
 * Pure serialization of a deck's `active` plank list (plus its companion, if open) into a pathname
 * under the pair-chain grammar — the reverse of `PathResolution.resolveUrl`. Extracted as a pure
 * function (taking pre-computed representations rather than a live graph builder) so it is testable
 * without an Effect runtime. A plank with no representation (an unmapped node, or the not-found
 * sentinel) is skipped with a `log.warn`, per the design's "unmapped nodes" rule.
 */
export const serializeDeckToUrl = (params: {
  workspace: string;
  /** The declared workspace-anchor key (conventionally `w`); see `PathResolution.getAnchorKey`. */
  workspaceKey: string;
  active: readonly string[];
  representations: Representations;
  companion?: CompanionRepresentation;
}): string => {
  const { workspace, workspaceKey, active, representations, companion } = params;

  const pairs: UrlPath.Pair[] = [];
  for (const id of active) {
    const rep = representations.get(id);
    if (!rep) {
      log.warn('plank has no URL representation; omitting from URL', { id });
      continue;
    }
    pairs.push({ key: rep.key, id: rep.id, workspace: rep.workspace });

    if (companion && companion.attendedId === id) {
      pairs.push({ key: companion.node.key, id: companion.node.id, workspace: companion.node.workspace });
    }
  }

  return UrlPath.format({ workspace, workspaceKey, pairs });
};
