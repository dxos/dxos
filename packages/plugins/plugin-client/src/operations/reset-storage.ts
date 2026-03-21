//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { ResetStorage } from './definitions';

import { RESET_DIALOG } from '../constants';

export default ResetStorage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: RESET_DIALOG,
        blockAlign: 'start',
        props: {
          mode: data.mode ?? 'reset storage',
        },
      });
    }),
  ),
);
