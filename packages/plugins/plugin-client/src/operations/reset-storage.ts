//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { RESET_DIALOG } from '../constants.ts';
import * as ClientOperation from '../types/ClientOperation.ts';

const handler: Operation.WithHandler<typeof ClientOperation.ResetStorage> = ClientOperation.ResetStorage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: RESET_DIALOG,
        blockAlign: 'start',
        props: {
          mode: data.mode ?? 'reset-storage',
          invitationCode: data.invitationCode,
        },
      });
    }),
  ),
);

export default handler;
