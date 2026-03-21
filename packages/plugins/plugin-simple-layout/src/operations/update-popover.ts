// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

export default LayoutOperation.UpdatePopover.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { updateState } = yield* layoutStateAccess;

      updateState((state) => ({
        ...state,
        popoverOpen: input.state ?? Boolean(input.subject),
        popoverKind: input.kind ?? 'base',
        popoverTitle: input.kind === 'card' ? input.title : undefined,
        popoverContent:
          typeof input.subject === 'string'
            ? { component: input.subject, props: input.props }
            : input.subject
              ? { subject: input.subject }
              : undefined,
        popoverSide: input.side,
        popoverVariant: input.variant,
        popoverAnchor: input.variant === 'virtual' ? input.anchor : state.popoverAnchor,
        popoverAnchorId: input.variant !== 'virtual' ? input.anchorId : state.popoverAnchorId,
      }));
    }),
  ),
);
