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
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { CompanionViewState, DeckCapabilities } from '#types';

import { getRenderedPlanks, isCompanionOpen, resolveCompanionAnchor } from '../util';
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
    workspace: GraphPath.getWorkspaceToken(registry.get(stateAtom).activeDeck) ?? '',
    pairs: [],
  }));
});

/**
 * Change what is open: push the URL, then project it.
 *
 * The deck's only mutation path. A history traversal reaches the same projection through the
 * `popstate` listener, so a click and a Back press are the same operation.
 *
 * Returns the plank attention has to move to because the one holding it is no longer open. The
 * projection does not choose a plank of its own here: this navigation came from an operation, which
 * knows what it acted on.
 */
export const navigate = Effect.fnUntraced(function* (next: Navigation.Navigation, method?: 'push' | 'replace') {
  return Navigation.push(next, method) ? yield* projectUrl(undefined, { attend: false }) : undefined;
});

/**
 * The navigation a deck represents: a pair per active plank, with the companion pair inserted after
 * the plank it is anchored to. The inverse of what the projection applies.
 */
export const deckNavigation = Effect.fnUntraced(function* (params: {
  workspace: string;
  active: readonly string[];
  companionPlanks?: readonly string[];
}) {
  const { workspace, active, companionPlanks = [] } = params;
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const attention = yield* Capability.get(AttentionCapabilities.Attention);
  const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

  const rendered = getRenderedPlanks(active, flatten);
  const anchorId = resolveCompanionAnchor(rendered, attention.getCurrent());
  const variant = viewState.get(CompanionViewState.aspect, CompanionViewState.CONTEXT).variant;
  const companionAnchor =
    anchorId && variant && isCompanionOpen(companionPlanks, flatten, anchorId) ? anchorId : undefined;

  const pairs: UrlPath.Pair[] = [];
  for (const nodeId of active) {
    // `representNode`, not the node's stamped `urlSegment`: the stamp needs a live node, and a plank
    // whose subtree is momentarily out of the graph still has provenance to represent it.
    const represented = PathResolution.representNode(builder, nodeId);
    if (Option.isNone(represented)) {
      // The URL is the only record of what is open, so a node with no binding cannot be a plank.
      log.error('node has no URL binding, so it cannot be opened', {
        nodeId,
        extension: builder.getNodeExtensionId(nodeId),
      });
      continue;
    }
    pairs.push(represented.value);
    if (nodeId === companionAnchor) {
      pairs.push({ key: UrlPath.COMPANION_KEY, id: variant, workspace });
    }
  }

  return { workspace, pairs };
});

/** Navigate to the deck `params` describes, returning the plank attention has to move to. */
export const navigateDeck = Effect.fnUntraced(function* (params: {
  workspace: string;
  active: readonly string[];
  companionPlanks?: readonly string[];
}) {
  return yield* navigate(yield* deckNavigation(params));
});
