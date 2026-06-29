//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
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
      const _state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

      let soloOperation:
        | { type: 'solo'; entryId: string; mode: string }
        | { type: 'unsolo'; entryId: string }
        | undefined;

      if (input.type === 'increment-end' || input.type === 'increment-start') {
        const next = incrementPlank(deck.active, input);
        const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      }

      if (input.type.startsWith('solo')) {
        const entryId = input.id;
        if (!deck.solo) {
          soloOperation = { type: 'solo', entryId, mode: input.type };
        } else {
          if (input.type === 'solo--fullscreen') {
            soloOperation = { type: 'solo', entryId, mode: 'solo--fullscreen' };
          } else if (input.type === 'solo') {
            soloOperation = { type: 'unsolo', entryId };
          }
        }
      }

      if (soloOperation?.type === 'solo') {
        yield* Operation.invoke(LayoutOperation.SetLayoutMode, {
          subject: soloOperation.entryId,
          mode: soloOperation.mode,
        });
      } else if (soloOperation?.type === 'unsolo') {
        yield* Operation.invoke(LayoutOperation.SetLayoutMode, { mode: 'multi' });
        yield* Operation.invoke(LayoutOperation.Open, { subject: [soloOperation.entryId] });
      }

      if (input.type === 'companion' || input.type === 'companion-vertical') {
        const orientation = input.type === 'companion-vertical' ? 'vertical' : 'horizontal';

        // Set the orientation first so an already-open companion re-orients in place (the Splitter stays
        // mounted and only its `orientation` prop changes — panels are never unmounted).
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionOrientation: orientation }),
        );

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
