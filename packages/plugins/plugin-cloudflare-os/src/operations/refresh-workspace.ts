//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CloudflareOsOperation } from '#types';

import { withRefDatabase } from './database.ts';
import { refreshWorkspace } from './refresh.ts';

/** Refreshes one workspace's title and gadget list. */
const handler: Operation.WithHandler<typeof CloudflareOsOperation.RefreshWorkspace> =
  CloudflareOsOperation.RefreshWorkspace.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ workspace: ref }) {
        return yield* Effect.gen(function* () {
          const workspace = yield* Database.load(ref).pipe(Effect.orDie);
          const gadgets = yield* refreshWorkspace(workspace).pipe(Effect.orDie);
          return { gadgets: gadgets.length };
        }).pipe(withRefDatabase(ref));
      }),
    ),
  );

export default handler;
