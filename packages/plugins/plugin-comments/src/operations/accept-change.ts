//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, CollaborationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

/**
 * Accept an individual change from a branch at an anchored region. Generic: dispatches to the
 * subject type's `CommentConfig.acceptChange` (markdown cherry-picks a text hunk; sheet cherry-picks
 * the anchored cells), so no object type is referenced here. No-op when the type opts out.
 */
const handler: Operation.WithHandler<typeof CollaborationOperation.AcceptChange> =
  CollaborationOperation.AcceptChange.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject, anchor, branch }) {
        const capabilities = yield* Capability.Service;
        const typename = Obj.getTypename(subject);
        const config = capabilities.getAll(AppCapabilities.CommentConfig).find(({ id }) => id === typename);
        if (config?.acceptChange) {
          yield* Effect.promise(() => config.acceptChange!(subject, anchor, branch));
        }
      }),
    ),
  );

export default handler;
