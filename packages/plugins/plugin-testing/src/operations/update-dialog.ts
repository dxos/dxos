//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { updateState } from './update-state';

export default LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      subject,
      state,
      type,
      blockAlign,
      overlayClasses,
      overlayStyle,
      props,
    }) {
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
