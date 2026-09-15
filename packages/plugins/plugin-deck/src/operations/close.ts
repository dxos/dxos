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
      const displaced = yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks });
      if (displaced) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: displaced });
      }
    }),
  ),
);

export default handler;
