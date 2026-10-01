//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, navigateDeck } from '../url/index.ts';
import { closeEntry, detailChain } from '../util/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();

      // A plank's details belong to it, so they close with it.
      const closing = input.subject.flatMap((id) => [id, ...detailChain(deck.plankNames, id)]);
      const active = closing.reduce((acc, id) => closeEntry(acc, id), deck.active);
      // No intent: the write focuses whichever plank attention falls to.
      yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks });
    }),
  ),
);

export default handler;
