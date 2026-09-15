//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckCapabilities, DeckSchema } from '#types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDrawer> = LayoutOperation.UpdateDrawer.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const current = state.drawerState ?? 'closed';
      const nextState = input.state === 'toggle' ? (current === 'open' ? 'closed' : 'open') : (input.state ?? current);
      const nextHeight =
        input.height === undefined
          ? state.drawerHeight
          : Math.min(DeckSchema.DRAWER_MAX_HEIGHT, Math.max(DeckSchema.DRAWER_MIN_HEIGHT, input.height));
      if (nextState !== current || nextHeight !== state.drawerHeight) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
          ...state,
          drawerState: nextState,
          drawerHeight: nextHeight,
        }));
      }
    }),
  ),
);

export default handler;
