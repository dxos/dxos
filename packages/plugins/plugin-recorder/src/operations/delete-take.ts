//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RecorderOperation } from '#types';

import { refersTo } from './take-ref.ts';

const handler: Operation.WithHandler<typeof RecorderOperation.DeleteTake> = RecorderOperation.DeleteTake.pipe(
  Operation.withHandler(({ slide, take }) =>
    Effect.sync(() => {
      const db = Obj.getDatabase(take);
      invariant(db, 'take is not in a database');
      const index = (slide.takes ?? []).findIndex((ref) => refersTo(ref, take.id));
      const main = refersTo(slide.mainTake, take.id);
      Obj.update(slide, (slide) => {
        slide.takes = (slide.takes ?? []).filter((ref) => !refersTo(ref, take.id));
        if (main) {
          slide.mainTake = slide.takes.at(-1);
        }
      });
      // Removes the take's file with it, since the take owns it.
      db.remove(take);
      return { slide, take, index, main };
    }),
  ),
);

export default handler;
