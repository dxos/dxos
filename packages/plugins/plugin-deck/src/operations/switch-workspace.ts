//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';

import { DeckCapabilities } from '#types';

import { applyWorkspace, navigateDeck } from '../url';
import { openableChildren } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      yield* applyWorkspace(input.subject);

      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const deck = state.decks[input.subject];
      invariant(deck, `Deck not found: ${input.subject}`);

      const seeded =
        deck.active.length === 0 && platform !== 'mobile' ? openableChildren(graph, input.subject).slice(0, 1) : [];
      const active = deck.active.length > 0 ? deck.active : seeded;

      const workspace = GraphPath.getWorkspaceToken(input.subject);
      if (workspace) {
        yield* navigateDeck({ workspace, active, companionPlanks: deck.companionPlanks });
      }

      const first = active[0];
      if (first) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
      }
    }),
  ),
);

export default handler;
