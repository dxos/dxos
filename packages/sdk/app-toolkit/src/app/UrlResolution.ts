//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';

import * as UrlPath from './UrlPath';

/**
 * Resolve a browser pathname under the pair-chain URL grammar (`UrlPath`) to a graph node id, for
 * in-app internal-link click-through (e.g. plugin-markdown's internal markdown links) where only a
 * pathname is on hand rather than an already-parsed pair chain. Only the first plank (id-bearing)
 * pair is resolved — a link always targets a single node, so anything past it (a linked pair, or
 * a second plank copied from a shared deck link) is ignored. Returns `Option.none()` for a pathname
 * that doesn't parse under the grammar, or whose target pair doesn't resolve to an existing node.
 */
export const resolveInternalLink = (
  builder: AppGraphBuilder.GraphBuilder,
  pathname: string,
): Effect.Effect<Option.Option<string>> =>
  Effect.gen(function* () {
    const keyTable = PathResolution.buildUrlKeyTable(builder);
    const parsed = UrlPath.parse(pathname, keyTable);
    if (Option.isNone(parsed)) {
      return Option.none();
    }

    const { workspace, pairs } = parsed.value;
    const plankPair = pairs.find((pair) => pair.id !== undefined);
    if (!plankPair) {
      return Option.none();
    }

    const resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs: [plankPair] });
    return Option.fromNullishOr(resolved[0]?.nodeId);
  });

/**
 * Build a single-object shareable link pathname (`/w/<workspace>/<key>/<id>`) for a graph node — the
 * outbound counterpart to {@link resolveInternalLink}. Returns `Option.none()` for a node with no
 * key-declaring producer (unmapped — see `PathResolution.representNode`).
 */
export const getShareableLinkPath = (builder: AppGraphBuilder.GraphBuilder, nodeId: string): Option.Option<string> => {
  // Composed from the node's own stamped `urlSegment` (`/<key>[/<id>]`) plus the workspace prefix — the
  // segment is the single source; `representNode` remains the multi-pair (deck) machinery.
  const urlSegment: string | undefined = Option.getOrUndefined(AppGraph.getNode(builder.graph, nodeId))?.properties
    ?.urlSegment;
  const workspace = nodeId.split('/')[1];
  if (!urlSegment || !workspace) {
    return Option.none();
  }
  return Option.some(`/${UrlPath.WORKSPACE_KEY}/${workspace}${urlSegment}`);
};
