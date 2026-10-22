//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { type Obj } from '@dxos/echo';

import { SearchOperation } from '#types';

import { SEARCH_DIALOG } from '../constants.ts';
import { makeSelectHandle } from '../select-handle.ts';

const handler: Operation.WithHandler<typeof SearchOperation.SelectObject> = SearchOperation.SelectObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ spaceId, title }) {
      const result = yield* Deferred.make<Obj.Unknown | undefined>();
      const handle = makeSelectHandle((object) => {
        Deferred.doneUnsafe(result, Effect.succeed(object));
      });

      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: SEARCH_DIALOG,
        blockAlign: 'start',
        props: { spaceId, title, handle },
      });

      return yield* Deferred.await(result);
    }),
  ),
);

export default handler;
