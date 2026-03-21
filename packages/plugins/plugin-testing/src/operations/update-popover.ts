//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { type LayoutStateProps } from '../types';
import { updateState } from './update-state';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdatePopover> = LayoutOperation.UpdatePopover.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { subject, state, side, kind, props } = input;
      yield* updateState(() => {
        const base: Partial<LayoutStateProps> = {
          popoverKind: kind ?? 'base',
          popoverTitle: kind === 'card' ? input.title : undefined,
          popoverContent:
            typeof subject === 'string' ? { component: subject, props } : subject ? { subject } : undefined,
          popoverOpen: state ?? Boolean(subject),
          popoverSide: side,
        };
        if ('variant' in input && input.variant === 'virtual') {
          return { ...base, popoverVariant: 'virtual', popoverAnchor: input.anchor };
        } else if ('anchorId' in input) {
          return { ...base, popoverVariant: 'react', popoverAnchorId: input.anchorId };
        }
        return base;
      });
    }),
  ),
);

export default handler;
