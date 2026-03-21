// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { CREATE_SPACE_DIALOG } from '../constants';

import { SpaceOperation } from './definitions';

export default SpaceOperation.OpenCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: CREATE_SPACE_DIALOG,
        blockAlign: 'start',
      });
    }),
  ),
);
