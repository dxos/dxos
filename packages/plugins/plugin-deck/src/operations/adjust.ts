//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

import { Adjust, ChangeCompanion } from './definitions';
import { updateActiveDeck } from './helpers';
import { incrementPlank } from '../layout';
import { DeckCapabilities, PLANK_COMPANION_TYPE } from '../types';
import { computeActiveUpdates } from '../util';

export default Adjust.pipe(
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
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, deckUpdates),
        );
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
        yield* Operation.invoke(LayoutOperation.SetLayoutMode, { mode: 'deck' });
        yield* Operation.invoke(LayoutOperation.Open, { subject: [soloOperation.entryId] });
      }

      if (input.type === 'companion') {
        const companion = Function.pipe(
          Graph.getNode(graph, input.id),
          Option.map((node) =>
            Graph.getConnections(graph, node.id, 'child')
              .filter((n) => n.type === PLANK_COMPANION_TYPE)
              .toSorted((a, b) => byPosition(a.properties, b.properties)),
          ),
          Option.flatMap((companions) => (companions.length > 0 ? Option.some(companions[0]) : Option.none())),
        );

        if (Option.isSome(companion)) {
          yield* Operation.invoke(ChangeCompanion, { companion: companion.value.id });
        }
      }
    }),
  ),
);
