//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';

import { Client } from '#api';
import { CloudflareOs, CloudflareOsOperation } from '#types';

import * as Account from '../Account.ts';
import { withRefDatabase } from './database.ts';

/** The title a workspace created for a space starts with. */
const NEW_WORKSPACE_TITLE = 'Composer';

/**
 * Binds a workspace to the space: finds the space's `Workspace` for the picked id, or creates it. The
 * "New workspace" target creates the workspace on the deployment first. Idempotent per workspace id.
 */
const handler: Operation.WithHandler<typeof CloudflareOsOperation.MaterializeWorkspace> =
  CloudflareOsOperation.MaterializeWorkspace.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        return yield* Effect.gen(function* () {
          const account = yield* Account.fromConnectionRef(connection);
          const user = yield* Account.open(account);

          const picked =
            remoteTarget && remoteTarget.id !== CloudflareOsOperation.NEW_WORKSPACE_TARGET ? remoteTarget : undefined;
          const { workspaceId, name } = picked
            ? { workspaceId: picked.id, name: picked.name }
            : yield* Effect.gen(function* () {
                const overseer = user.newWorkspace();
                yield* Client.call('Could not name the new workspace.', () => overseer.setTitle(NEW_WORKSPACE_TITLE));
                const metadata = yield* Client.call('Could not create a workspace.', () => overseer.getMetadata());
                Client.dispose(overseer);
                return { workspaceId: metadata.id, name: metadata.title };
              });

          const existing = yield* Database.query(Filter.type(CloudflareOs.Workspace, { workspaceId })).first.pipe(
            Effect.map(Option.getOrUndefined),
          );
          if (existing) {
            return { target: Ref.make(existing) };
          }

          const workspace = yield* Database.add(CloudflareOs.make({ name, workspaceId, connection, gadgets: [] }));
          return { target: Ref.make(workspace) };
        }).pipe(Effect.scoped, withRefDatabase(connection), Effect.orDie);
      }),
    ),
  );

export default handler;
