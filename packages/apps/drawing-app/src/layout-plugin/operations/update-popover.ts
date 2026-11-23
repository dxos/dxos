//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdatePopover> = LayoutOperation.UpdatePopover.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { subject, state, side, kind, props } = input;
      yield* updateState((current) => ({
        popoverOpen: state ?? Boolean(subject),
        popoverKind: kind ?? 'base',
        popoverContent:
          typeof subject === 'string' ? { component: subject, props } : subject ? { subject } : current.popoverContent,
        popoverAnchor:
          'variant' in input && input.variant === 'virtual'
            ? { anchor: input.anchor }
            : input.anchorId
              ? { anchorId: input.anchorId }
              : current.popoverAnchor,
        popoverSide: side,
      }));
    }),
  ),
);

export default handler;
