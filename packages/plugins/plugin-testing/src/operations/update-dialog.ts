//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDialog> = LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, state, type, blockAlign, overlayClasses, overlayStyle, props }) {
      yield* updateState(() => ({
        dialogOpen: state ?? Boolean(subject),
        dialogType: type ?? 'default',
        dialogBlockAlign: blockAlign ?? 'center',
        dialogOverlayClasses: overlayClasses,
        dialogOverlayStyle: overlayStyle,
        dialogContent: subject ? { component: subject, props } : null,
      }));
    }),
  ),
);

export default handler;
