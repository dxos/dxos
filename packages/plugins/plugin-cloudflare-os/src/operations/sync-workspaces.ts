//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { CloudflareOsError } from '#api';
import { CloudflareOs, CloudflareOsOperation } from '#types';

import { withRefDatabase } from './database.ts';
import { refreshWorkspace } from './refresh.ts';

/** How long one workspace's refresh may take, sign-in included. */
const REFRESH_TIMEOUT_MS = 60_000;

/** Refreshes every workspace in the space that the connection binds. */
const handler: Operation.WithHandler<typeof CloudflareOsOperation.SyncWorkspaces> =
  CloudflareOsOperation.SyncWorkspaces.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        return yield* Effect.gen(function* () {
          const connectionId = connection.target ? Obj.getURI(connection.target) : undefined;
          const workspaces = (yield* Database.query(Filter.type(CloudflareOs.Workspace)).run).filter(
            (workspace) => workspace.connection.target && Obj.getURI(workspace.connection.target) === connectionId,
          );
          // One unreachable workspace must not stop the others from refreshing.
          yield* Effect.forEach(
            workspaces,
            (workspace) =>
              refreshWorkspace(workspace).pipe(
                Effect.timeoutOrElse({
                  duration: REFRESH_TIMEOUT_MS,
                  orElse: () => Effect.fail(new CloudflareOsError({ message: 'Refreshing the workspace timed out.' })),
                }),
                Effect.catch((error) => Effect.sync(() => log.warn('workspace refresh failed', { error }))),
              ),
            { discard: true },
          );
          return { workspaces: workspaces.length };
        }).pipe(withRefDatabase(connection), Effect.orDie);
      }),
    ),
  );

export default handler;
