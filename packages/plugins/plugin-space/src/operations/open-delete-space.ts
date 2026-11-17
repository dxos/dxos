//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { DELETE_SPACE_DIALOG } from '../constants.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenDeleteSpace> = SpaceOperation.OpenDeleteSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: DELETE_SPACE_DIALOG,
        type: 'alert',
        props: { space },
      });
    }),
  ),
);

export default handler;
