//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';

import { GitHubOperation } from '#types';

import { GitHubRepoUnresolvedError } from '../errors.ts';
import { isFileBinding } from '../file-sync/sync-files.ts';

const handler: Operation.WithHandler<typeof GitHubOperation.EnableGitHubFileSync> =
  GitHubOperation.EnableGitHubFileSync.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ repository, branch, writeBranch, mappings, paths }) {
        const repo = yield* Database.load(repository);
        const cursors = (yield* Database.query(Filter.type(Cursor.Cursor)).run).filter(
          (cursor): cursor is Cursor.ExternalCursor =>
            Cursor.isExternal(cursor) && cursor.spec.target.uri === Obj.getURI(repo),
        );
        const existing = cursors.find(isFileBinding);
        if (existing) {
          return { binding: existing.id, created: false };
        }
        // The file binding reuses the item binding's credential and repository id.
        const items = cursors.find((cursor) => !isFileBinding(cursor));
        if (!items) {
          return yield* Effect.fail(new GitHubRepoUnresolvedError({ context: { repository: Obj.getURI(repo) } }));
        }
        const binding = yield* Database.add(
          Cursor.makeExternal({
            source: items.spec.source,
            target: items.spec.target,
            externalId: items.spec.externalId,
            label: items.spec.label,
            options: {
              stream: 'files',
              branch: branch ?? repo.defaultBranch ?? 'main',
              ...(writeBranch ? { writeBranch } : {}),
              ...(mappings ? { mappings: [...mappings] } : {}),
              ...(paths ? { paths: [...paths] } : {}),
            },
          }),
        );
        return { binding: binding.id, created: true };
      }),
    ),
  );

export default handler;
