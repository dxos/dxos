//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RecorderOperation } from '#types';

const handler: Operation.WithHandler<typeof RecorderOperation.RestoreTake> = RecorderOperation.RestoreTake.pipe(
  Operation.withHandler(({ slide, take, index, main }) =>
    Effect.sync(() => {
      const db = Obj.getDatabase(slide);
      invariant(db, 'slide is not in a database');
      const restored = db.add(take);
      // The file the take owns was removed with it.
      const file = take.content?.target;
      if (file && Obj.isDeleted(file)) {
        db.add(file);
      }
      Obj.update(slide, (slide) => {
        slide.takes ??= [];
        slide.takes.splice(index < 0 ? slide.takes.length : index, 0, Ref.make(restored));
        if (main) {
          slide.mainTake = Ref.make(restored);
        }
      });
    }),
  ),
);

export default handler;
