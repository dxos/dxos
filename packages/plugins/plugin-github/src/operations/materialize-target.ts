//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { GitHubOperation } from '#types';

import { type RepoDescriptor, ensureRepo } from './repo.ts';
import { ensureIssueSet } from './sync.ts';

const RepoMetadata = Schema.Struct({
  owner: Schema.String,
  name: Schema.String,
  url: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  defaultBranch: Schema.optional(Schema.String),
});

/**
 * The repository a picked target names: discovery passes the coordinates in `metadata`; a target
 * without them (from before discovery carried them) splits its `owner/name` label.
 */
export const toTargetDescriptor = (target: ConnectorSpec.RemoteTarget): RepoDescriptor | undefined => {
  const metadata = Schema.decodeUnknownOption(RepoMetadata)(target.metadata);
  if (metadata._tag === 'Some') {
    return { ...metadata.value, id: target.id };
  }
  const [owner, name, ...rest] = target.name.split('/');
  return owner && name && rest.length === 0
    ? { id: target.id, owner, name, description: target.description }
    : undefined;
};

/**
 * Find or create the `Repo` a binding targets, keyed by its GitHub id, and the `TaskSet` that mirrors
 * its issues, which shares that key. Idempotent: a second binding of the same repository reuses both.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.MaterializeGitHubTarget> =
  GitHubOperation.MaterializeGitHubTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        const descriptor = remoteTarget ? toTargetDescriptor(remoteTarget) : undefined;
        if (!descriptor) {
          return yield* Effect.die(new Error('GitHub materializeTarget requires an owner/name repository target.'));
        }
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.die(new Error('No database for connection ref.'));
        }

        return yield* Effect.gen(function* () {
          const repo = yield* ensureRepo(descriptor);
          yield* ensureIssueSet(repo, descriptor.id);
          return { target: Ref.make(repo) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
