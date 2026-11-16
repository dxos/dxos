//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { EID } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { ViewLocation } from '@dxos/react-ui-attention/types';

import { DeckCapabilities } from '#types';

type SpaceReport = { location: ViewLocation.ViewLocation; companions: AppCapabilities.Companions };

/**
 * Reports where the deck is in each space it shows, keyed by the space's EID: its front plank as the space's
 * `ViewLocation` viewport, and its open companions. A space it no longer shows goes back to the defaults.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const deckViewAtom = yield* DeckCapabilities.View;
    const viewState = yield* AttentionCapabilities.ViewState;

    const bySpace = Atom.make((get) => {
      const { active } = get(layoutAtom);
      const { front, companions } = get(deckViewAtom);
      const spaces = new Map<string, SpaceReport>();
      for (const spaceId of new Set(active.flatMap((plank) => GraphPath.getSpaceIdFromPath(plank) ?? []))) {
        const inSpace = (path: string) => GraphPath.getSpaceIdFromPath(path) === spaceId;
        spaces.set(EID.make({ spaceId }), {
          location: front && inSpace(front) ? { viewport: front } : {},
          companions: {
            planks: companions.items.filter(inSpace),
            ...(companions.variant && { variant: companions.variant }),
          },
        });
      }
      return spaces;
    });

    const report = (spaces: ReadonlyMap<string, SpaceReport>) => {
      for (const contextId of new Set([...viewState.contexts(AppCapabilities.Companions), ...spaces.keys()])) {
        const space = spaces.get(contextId);
        const location = space?.location ?? ViewLocation.aspect.defaultValue();
        const companions = space?.companions ?? AppCapabilities.Companions.defaultValue();
        if (JSON.stringify(viewState.get(ViewLocation.aspect, contextId)) !== JSON.stringify(location)) {
          viewState.set(ViewLocation.aspect, contextId, location);
        }
        if (JSON.stringify(viewState.get(AppCapabilities.Companions, contextId)) !== JSON.stringify(companions)) {
          viewState.set(AppCapabilities.Companions, contextId, companions);
        }
      }
    };
    report(registry.get(bySpace));
    const unsubscribe = registry.subscribe(bySpace, report);
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
    return [];
  }),
);
