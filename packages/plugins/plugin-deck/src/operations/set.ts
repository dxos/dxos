//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, navigateDeck } from '../url/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();
      const displaced = yield* navigateDeck({
        workspace,
        active: input.subject as string[],
        companionPlanks: deck.companionPlanks,
      });
      if (displaced) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: displaced });
      }
    }),
  ),
);

export default handler;
