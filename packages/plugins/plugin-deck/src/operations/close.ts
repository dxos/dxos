//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities } from '#types';

import { currentNavigation, deckNavigation, navigate } from '../capabilities/navigate';
import { closeEntry } from '../layout';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const { workspace } = yield* currentNavigation();

      const active = input.subject.reduce((acc, id) => closeEntry(acc, id), deck.active);
      const next = yield* deckNavigation({ workspace, active, companionPlanks: deck.companionPlanks });
      yield* navigate(next);
    }),
  ),
);

export default handler;
