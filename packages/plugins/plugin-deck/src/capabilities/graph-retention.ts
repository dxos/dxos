//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';

import { DeckCapabilities } from '#types';

import { retainedWorkspaces } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* DeckCapabilities.State;
    const layoutAtom = yield* AppCapabilities.Layout;

    const retention: AppCapabilities.AppGraphRetention = {
      // Actions and companions are facets of the node they hang off, so their edges span no distance.
      attached: [AppGraphNode.action, AppNode.companion],
      retained: Atom.make((get) => {
        const { activeDeck, previousDeck } = get(stateAtom);
        return retainedWorkspaces({
          activeDeck,
          previousDeck,
          retainedPlanks: get(layoutAtom).active,
        });
      }),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
