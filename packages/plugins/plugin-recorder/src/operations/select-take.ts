//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { RecorderOperation } from '#types';

const handler: Operation.WithHandler<typeof RecorderOperation.SelectTake> = RecorderOperation.SelectTake.pipe(
  Operation.withHandler(({ slide, take }) =>
    Effect.sync(() => {
      Obj.update(slide, (slide) => {
        slide.mainTake = Ref.make(take);
      });
    }),
  ),
);

export default handler;
