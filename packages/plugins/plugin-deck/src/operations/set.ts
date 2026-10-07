//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

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
      // No intent: the write focuses whichever plank attention falls to.
      yield* navigateDeck({ workspace, active: subject, companionPlanks: deck.companionPlanks });
    }),
  ),
);

export default handler;
