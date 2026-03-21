//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { CreateRecoveryCode } from './definitions';

import { RECOVERY_CODE_DIALOG } from '../constants';
import { ClientCapabilities } from '../types';

const handler: Operation.WithHandler<typeof CreateRecoveryCode> = CreateRecoveryCode.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');
      const { recoveryCode } = yield* Effect.promise(() =>
        client.services.services.IdentityService!.createRecoveryCredential({}),
      );
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
