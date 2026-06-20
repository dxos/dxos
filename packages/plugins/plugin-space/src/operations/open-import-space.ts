// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { IMPORT_SPACE_DIALOG } from '../constants';
import { SpaceOperation } from './definitions';

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
