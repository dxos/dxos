//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';

import { DeckCapabilities } from '#types';

import { openableChildren } from '../util';
import { applyWorkspace } from './apply';

const handler: Operation.WithHandler<typeof LayoutOperation.SwitchWorkspace> = LayoutOperation.SwitchWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      yield* applyWorkspace(input.subject);

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        const deck = state.decks[input.subject];
        invariant(deck, `Deck not found: ${input.subject}`);

        const first = deck.active[0];
        if (first) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
        } else if (platform !== 'mobile') {
          // Mobile lands on the workspace's own list panel; auto-opening the first child would skip it.
          const [item] = openableChildren(graph, input.subject);
          if (item) {
            // Use `invoke` (synchronous) rather than `schedule` (fire-and-forget) so
            // that the implicit "open first child" finishes BEFORE this handler
            // returns. Otherwise, a caller that follows `SwitchWorkspace` with its
            // own `Open` (e.g. WelcomePlugin DefaultContent) has its `active`
            // clobbered by this scheduled Open when it later races behind the
            // caller's state writes.
            yield* Operation.invoke(LayoutOperation.Open, { subject: [item] });
          }
        }
      }
    }),
  ),
);

export default handler;
