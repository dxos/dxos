//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph } from '@dxos/plugin-graph';

import { incrementPlank } from '../layout';
import { DeckCapabilities, DeckOperation, PLANK_COMPANION_TYPE } from '../types';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof DeckOperation.Adjust> = DeckOperation.Adjust.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

      if (input.type === 'increment-end' || input.type === 'increment-start') {
        const next = incrementPlank(deck.active, input);
        const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      }

      if (input.type === 'fullscreen') {
        // Fullscreen is a transient overlay, independent of `active`: toggle it on/off for this plank.
        yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
          ...state,
          fullscreen: state.fullscreen === input.id ? undefined : input.id,
        }));
      }

      if (input.type === 'companion') {
        // Open the companion when one is available; the selected variant lives in global view state and is
        // resolved at render time, so opening restores the last-selected tab rather than forcing the first.
        if (!deck.companionOpen) {
          const hasCompanion = Function.pipe(
            Graph.getNode(graph, input.id),
            Option.map((node) =>
              Graph.getConnections(graph, node.id, 'child').some((n) => n.type === PLANK_COMPANION_TYPE),
            ),
            Option.getOrElse(() => false),
          );

          if (hasCompanion) {
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, { companionOpen: true }),
            );
          }
        }
      }
    }),
  ),
);

export default handler;
