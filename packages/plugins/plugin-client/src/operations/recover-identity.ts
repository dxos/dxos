//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { type JoinPanelProps } from '@dxos/shell/react';

import { RecoverIdentity } from './definitions';

import { JOIN_DIALOG } from '../constants';

export default RecoverIdentity.pipe(
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
