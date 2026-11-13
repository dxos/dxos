//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, navigateDeck } from '../url/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const subject = input.subject as string[];
      for (const subjectId of subject) {
        AppGraph.expandPath(graph, subjectId);
      }
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();
      // An earlier navigation's scroll intent would still focus its plank once mounted, which `focus: false` declines.
      if (input.focus === false) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) =>
          state.scrollIntoView === undefined ? state : { ...state, scrollIntoView: undefined },
        );
      }
      // No intent: the write focuses whichever plank attention falls to; an empty one focuses none.
      yield* navigateDeck({
        workspace,
        active: subject,
        companionPlanks: deck.companionPlanks,
        intent: input.focus === false ? {} : undefined,
      });
    }),
  ),
);

export default handler;
