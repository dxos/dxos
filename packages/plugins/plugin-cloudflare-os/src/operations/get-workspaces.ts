//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Client } from '#api';
import { CloudflareOsOperation } from '#types';

import * as Account from '../Account.ts';
import { withRefDatabase } from './database.ts';

/** Discovery only: lists the account's workspaces, newest first, and a target that creates a new one. */
const handler: Operation.WithHandler<typeof CloudflareOsOperation.GetWorkspaces> =
  CloudflareOsOperation.GetWorkspaces.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        return yield* Effect.gen(function* () {
          const account = yield* Account.fromConnectionRef(connection);
          const user = yield* Account.open(account);
          const workspaces = yield* Client.call('Could not list the workspaces.', () => user.listWorkspaces());
          const existing = [...workspaces]
            .sort((left, right) => (right.lastActive?.getTime() ?? 0) - (left.lastActive?.getTime() ?? 0))
            .map((workspace) => ({ id: workspace.id, name: workspace.title || workspace.id }));
          return {
            targets: [
              {
                id: CloudflareOsOperation.NEW_WORKSPACE_TARGET,
                name: 'New workspace',
                description: 'Create a workspace for this space',
              },
              ...existing,
            ],
          };
        }).pipe(Effect.scoped, withRefDatabase(connection), Effect.orDie);
      }),
    ),
  );

export default handler;
