// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { RENAME_POPOVER } from '../constants.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.Rename> = SpaceOperation.Rename.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: RENAME_POPOVER,
        anchorId: input.caller ?? '',
        props: input.space,
        kind: 'rename',
      });
    }),
  ),
);
export default handler;
