//
// Copyright 2026 DXOS.org
//

import type * as PathResolution from '@dxos/app-graph/PathResolution';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { log } from '@dxos/log';

/** Reverse-mapped `(key, id?, workspace)` representation of every plank id worth serializing. */
export type Representations = ReadonlyMap<string, PathResolution.RepresentedNode>;

/** The open companion, if any, already reverse-mapped. */
export type CompanionRepresentation = {
  /** Id of the plank the companion shares a container with (the attended plank). */
  plankId: string;
  node: PathResolution.RepresentedNode;
};

/**
 * Pure serialization of a deck's `active` plank list (plus its companion, if open) into a pathname
 * under the pair-chain grammar — the reverse of `PathResolution.resolveUrl`. Extracted as a pure
 * function (taking pre-computed representations rather than a live graph builder) so it is testable
 * without an Effect runtime.
 *
 * A plank with no representation is skipped, which keeps this function total; callers must not write
 * a skipped result to the URL, since the next restore reads a shortened URL as truth.
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

    if (companion && companion.plankId === id) {
      pairs.push({ key: companion.node.key, id: companion.node.id, workspace: companion.node.workspace });
    }
  }

  return UrlPath.format({ workspace, workspaceKey, pairs });
};
