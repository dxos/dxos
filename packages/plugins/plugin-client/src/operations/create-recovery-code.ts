//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import { RECOVERY_CODE_DIALOG } from '../constants.ts';
import * as ClientOperation from '../types/ClientOperation.ts';

const handler: Operation.WithHandler<typeof ClientOperation.CreateRecoveryCode> =
  ClientOperation.CreateRecoveryCode.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        const { recoveryCode } = yield* Identity.createRecoveryCredential();
        yield* Operation.invoke(LayoutOperation.UpdateDialog, {
          subject: RECOVERY_CODE_DIALOG,
          blockAlign: 'start',
          type: 'alert',
          props: { code: recoveryCode },
        });
      }),
    ),
  );

export default handler;
