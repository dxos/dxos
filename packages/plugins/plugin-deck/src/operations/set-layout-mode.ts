//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { isNonNullable } from '@dxos/util';

import { DeckCapabilities, type DeckState, type LayoutMode, getMode, isLayoutMode } from '../types';
import { updateActiveDeck } from './helpers';

/**
 * Transitions between layout modes (multi, solo, solo--fullscreen) or reverts to the previous mode.
 * Computes which planks become active/inactive and persists the previous mode for revert support.
 */
const handler: Operation.WithHandler<typeof LayoutOperation.SetLayoutMode> = LayoutOperation.SetLayoutMode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if ('mode' in input && !isLayoutMode(input.mode)) {
        return;
      }

      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = yield* DeckCapabilities.getDeck();

      const computeModeUpdate = (mode: LayoutMode, subject?: string): Partial<DeckState> => {
        const current = deck.solo ? [deck.solo] : deck.active;
        const next = (mode !== 'multi' ? [subject ?? deck.solo ?? deck.active[0]] : [...deck.active, deck.solo]).filter(
          isNonNullable,
        );

        const removed = current.filter((id: string) => !next.includes(id));
        const closed = Array.from(new Set([...deck.inactive.filter((id: string) => !next.includes(id)), ...removed]));

        const soloUpdate =
          mode !== 'multi' && next[0]
            ? { solo: next[0] }
            : mode === 'multi' && deck.solo
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
        const subject = 'subject' in input ? input.subject : undefined;
        const deckUpdates = computeModeUpdate(input.mode as LayoutMode, subject);

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

        if (subject) {
          yield* Operation.schedule(LayoutOperation.Expose, { subject });
        }
      } else if ('revert' in input) {
        const deckUpdates = computeModeUpdate(state.previousMode[state.activeDeck]);
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      } else {
        log.warn('Invalid layout mode', input);
      }
    }),
  ),
);

export default handler;
