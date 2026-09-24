// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { IMPORT_SPACE_DIALOG } from '../constants.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenImportSpace> = SpaceOperation.OpenImportSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: IMPORT_SPACE_DIALOG,
        blockAlign: 'start',
      });
    }),
  ),
);
export default handler;
