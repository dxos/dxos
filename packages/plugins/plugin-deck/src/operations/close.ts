//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, navigateDeck } from '../url/index.ts';
import { closeEntry } from '../util/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();

      const active = input.subject.reduce((acc, id) => closeEntry(acc, id), deck.active);
      // The neighbor attention falls to takes its focus intent in the same write, so it never paints unattended.
      yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks, attendDisplaced: true });
    }),
  ),
);

export default handler;
