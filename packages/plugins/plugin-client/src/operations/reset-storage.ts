//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { ResetStorage } from './definitions';

import { RESET_DIALOG } from '../constants';

const handler: Operation.WithHandler<typeof ResetStorage> = ResetStorage.pipe(
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

export default handler;
