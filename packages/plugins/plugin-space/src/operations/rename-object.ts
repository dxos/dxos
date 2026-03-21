// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { OBJECT_RENAME_POPOVER } from '../constants';

import { SpaceOperation } from './definitions';

export default SpaceOperation.RenameObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const object = input.object as Obj.Unknown;
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: OBJECT_RENAME_POPOVER,
        anchorId: input.caller ?? '',
        props: object,
      });
    }),
  ),
);
