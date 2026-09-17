//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DeckCapabilities } from '#types';

import { pendingPlanks, retainedWorkspaces } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* DeckCapabilities.State;
    const layoutAtom = yield* AppCapabilities.Layout;

    const retention: AppGraphBuilder.Retention = {
      retained: Atom.make((get) => {
        const { activeDeck, previousDeck } = get(stateAtom);
        return retainedWorkspaces({
          activeDeck,
          previousDeck,
          retainedPlanks: [...get(layoutAtom).active, ...get(pendingPlanks)],
        });
      }),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
