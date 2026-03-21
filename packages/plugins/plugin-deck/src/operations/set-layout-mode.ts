//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { isNonNullable } from '@dxos/util';

import { updateActiveDeck } from './helpers';
import { DeckCapabilities, type DeckState, type LayoutMode, getMode, isLayoutMode } from '../types';

export default LayoutOperation.SetLayoutMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if ('mode' in input && !isLayoutMode(input.mode)) {
        return;
      }
      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = yield* DeckCapabilities.getDeck();

      const computeModeUpdate = (mode: LayoutMode, subject?: string): Partial<DeckState> => {
        const current = deck.solo ? [deck.solo] : deck.active;
        const next = (
          mode !== 'deck' ? [subject ?? deck.solo ?? deck.active[0]] : [...deck.active, deck.solo]
        ).filter(isNonNullable);

        const removed = current.filter((id: string) => !next.includes(id));
        const closed = Array.from(
          new Set([...deck.inactive.filter((id: string) => !next.includes(id)), ...removed]),
        );

        const soloUpdate =
          mode !== 'deck' && next[0]
            ? { solo: next[0] }
            : mode === 'deck' && deck.solo
              ? { solo: undefined, initialized: true }
              : {};

        const fullscreenUpdate = mode === 'solo--fullscreen' ? { fullscreen: !deck.fullscreen } : {};

        return {
          inactive: closed,
          ...soloUpdate,
          ...fullscreenUpdate,
        };
      };

      if ('mode' in input) {
        const currentMode = getMode(deck);
        const deckUpdates = computeModeUpdate(
          input.mode as LayoutMode,
          'subject' in input ? input.subject : undefined,
        );

        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => {
          const newPreviousMode =
            currentMode !== input.mode
              ? { ...state.previousMode, [state.activeDeck]: currentMode }
              : state.previousMode;
          return {
            ...updateActiveDeck(state, deckUpdates),
            previousMode: newPreviousMode,
          };
        });
      } else if ('revert' in input) {
        const last = state.previousMode[state.activeDeck];
        const deckUpdates = computeModeUpdate(last ?? 'solo');
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, deckUpdates),
        );
      } else {
        log.warn('Invalid layout mode', input);
      }
    }),
  ),
);
