// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SPACE_RENAME_POPOVER } from '../constants';
import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Rename> = SpaceOperation.Rename.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: SPACE_RENAME_POPOVER,
        anchorId: input.caller ?? '',
        props: input.space,
      });
    }),
  ),
);
export default handler;
