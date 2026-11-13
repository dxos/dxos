//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { StashedLink } from '../types/StashedLink.ts';
import { MarkRead } from '../types/StashedLinkOperation.ts';

// #region handler
const handler: Operation.WithHandler<typeof MarkRead> = MarkRead.pipe(
  Operation.withHandler(({ link: ref }) =>
    Effect.gen(function* () {
      // The assistant passes a reference by id, so look it up in the space.
      const link = yield* Database.resolve(ref, StashedLink);
      Obj.update(link, (link) => {
        link.read = true;
      });
    }),
  ),
);

export default handler;
// #endregion
