//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import type { JoinPanelProps } from '@dxos/shell/react';

import { JOIN_DIALOG } from '../constants';
import { RecoverIdentity } from './definitions';

const handler: Operation.WithHandler<typeof RecoverIdentity> = RecoverIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: JOIN_DIALOG,
        blockAlign: 'start',
        props: {
          initialDisposition: 'recover-identity',
        } satisfies Partial<JoinPanelProps>,
      });
    }),
  ),
);

export default handler;
