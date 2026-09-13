//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, navigateDeck } from '../url/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const subject = input.subject as string[];
      // A plank is only representable once its node is in the graph, which a just-created space's
      // Home may not be yet; expanding the path first is what `Open` does for the same reason.
      for (const subjectId of subject) {
        NotFound.expandPath(graph, subjectId);
      }
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();
      const displaced = yield* navigateDeck({
        workspace,
        active: subject,
        companionPlanks: deck.companionPlanks,
      });
      if (displaced) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: displaced });
      }
    }),
  ),
);

export default handler;
