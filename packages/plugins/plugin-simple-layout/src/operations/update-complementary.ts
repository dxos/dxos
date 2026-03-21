// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { getCompanionVariant, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateComplementary> =
  LayoutOperation.UpdateComplementary.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const { updateState } = yield* layoutStateAccess;

        if (input.state === 'closed') {
          updateState((state) => ({
            ...state,
            drawerState: 'closed',
            companionVariant: undefined,
          }));
        } else if (input.subject) {
          const variant = getCompanionVariant(input.subject);
          updateState((state) => ({
            ...state,
            companionVariant: variant,
            drawerState: input.state === 'expanded' ? 'expanded' : 'open',
          }));
        }
      }),
    ),
  );

export default handler;
