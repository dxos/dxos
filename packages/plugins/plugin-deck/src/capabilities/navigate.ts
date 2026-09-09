//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { log } from '@dxos/log';

import { DeckCapabilities } from '#types';

import * as Navigation from '../util/navigation';
import { projectUrl } from './project-url';

/**
 * What the URL currently says is open.
 *
 * Read from the address bar rather than from deck state, because the address bar is the source of
 * truth: a plank the URL names but the graph has not resolved yet is in the URL and not in the deck,
 * and an operation must not drop it.
 */
export const currentNavigation = Effect.fnUntraced(function* () {
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const parsed = Navigation.parse(window.location.pathname, PathResolution.buildUrlKeyTable(builder));
  return Option.getOrElse(parsed, () => ({
    // Before the URL keys register there is nothing to read, so fall back to the workspace the deck
    // is on and an empty chain. The operation's own subject is added by the caller.
    workspace: GraphPath.getSpaceIdFromPath(registry.get(stateAtom).activeDeck) ?? '',
    pairs: [],
  }));
});

/**
 * Change what is open: push the URL, then project it.
 *
 * The deck's only mutation path. A history traversal reaches the same projection through the
 * `popstate` listener, so a click and a Back press are the same operation.
 */
export const navigate = Effect.fnUntraced(function* (next: Navigation.Navigation, method?: 'push' | 'replace') {
  if (Navigation.push(next, method)) {
    yield* projectUrl();
  }
});

/**
 * The pairs for `nodeIds`, dropping any node that is not addressable.
 *
 * A node with no URL segment cannot be a plank, since the URL is the only record of what is open.
 * Logged with the producing extension so the missing binding can be found.
 */
export const pairsForNodes = Effect.fnUntraced(function* (nodeIds: readonly string[], workspace: string) {
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const pairs = [];
  for (const nodeId of nodeIds) {
    const segment = Navigation.segmentForNode(builder.graph, nodeId);
    if (!segment) {
      log.error('node has no URL binding, so it cannot be opened', {
        nodeId,
        extension: builder.getNodeExtensionId(nodeId),
      });
      continue;
    }
    pairs.push(Navigation.fromSegment(segment, workspace));
  }
  return pairs;
});
