//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { SHARE_OBJECT_DIALOG } from '../constants.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenShareObject> = SpaceOperation.OpenShareObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: SHARE_OBJECT_DIALOG,
        blockAlign: 'start',
        props: { object },
      });
    }),
  ),
);
export default handler;
