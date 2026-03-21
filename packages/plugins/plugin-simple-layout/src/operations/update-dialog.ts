// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { layoutStateAccess } from './state-access';

export default LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { updateState } = yield* layoutStateAccess;

      updateState((state) => ({
        ...state,
        dialogOpen: input.state ?? Boolean(input.subject),
        dialogType: input.type ?? 'default',
        dialogBlockAlign: input.blockAlign ?? 'center',
        dialogOverlayClasses: input.overlayClasses,
        dialogOverlayStyle: input.overlayStyle,
        dialogContent: input.subject ? { component: input.subject, props: input.props } : undefined,
      }));
    }),
  ),
);
