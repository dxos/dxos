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
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { incrementPlank } from '../layout';
import { DeckCapabilities, DeckOperation, PLANK_COMPANION_TYPE } from '../types';
import { COMPANION_VIEW_STATE_CONTEXT, companionVariantAspect, computeActiveUpdates } from '../util';
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
        // Open the companion when the plank has one. The trailing companion plank is derived from the
        // selected variant (global view state); if none is selected yet (or the stored one is not a
        // companion of this plank), seed it with this plank's first companion so the URL and render
        // agree. `UpdateCompanion` (tab switch) overrides it thereafter.
        if (!deck.companionOpen) {
          const companions = Function.pipe(
            Graph.getNode(graph, input.id),
            Option.map((node) =>
              Graph.getConnections(graph, node.id, 'child')
                .filter((n) => n.type === PLANK_COMPANION_TYPE)
                .toSorted((a, b) =>
                  Position.compare({ position: a.properties?.position }, { position: b.properties?.position }),
                ),
            ),
            Option.getOrElse(() => []),
          );

          if (companions.length > 0) {
            const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
            const selected = viewState.get(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT);
            const preferred = selected.variant
              ? companions.find((companion) => getLinkedVariant(companion.id) === selected.variant)
              : undefined;
            const companion = preferred ?? companions[0];
            if (!preferred) {
              viewState.set(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT, {
                variant: getLinkedVariant(companion.id),
              });
            }
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, { companionOpen: true }),
            );
            // The companion renders as the trailing plank; scroll it into view like any newly opened
            // plank (otherwise it appears off-screen to the right of the last plank).
            yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: companion.id });
          }
        }
      }
    }),
  ),
);

export default handler;
