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

import { Navigation, getRenderedPlanks, isCompanionOpen, resolveCompanionAnchor } from '../util';
import { projectUrl } from './project';

/** What the URL currently says is open. */
export const currentNavigation = Effect.fnUntraced(function* () {
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const parsed = Navigation.parse(window.location.pathname, PathResolution.buildUrlKeyTable(builder));
  return Option.getOrElse(parsed, () => ({
    workspace: GraphPath.getWorkspaceToken(registry.get(stateAtom).activeDeck) ?? '',
    pairs: [],
  }));
});

/**
 * Change what is open: push the URL, then project it. Returns the plank attention has to move to
 * because the one holding it is no longer open.
 */
export const navigate = Effect.fnUntraced(function* (next: Navigation.Navigation, method?: 'push' | 'replace') {
  if (!next.workspace) {
    log.warn('navigation has no workspace, so it cannot be pushed', { pairs: next.pairs.length });
    return undefined;
  }
  return Navigation.push(next, method) ? yield* projectUrl(undefined, { attend: false }) : undefined;
});

/**
 * The navigation a deck represents: a pair per active plank, with the companion pair inserted after
 * the plank it is anchored to.
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
    const represented = PathResolution.representNode(builder, nodeId);
    if (Option.isNone(represented)) {
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
