//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { GitHubPullRequestReferenceError } from '../errors.ts';
import { parsePullRequestReference } from '../github-link.ts';
import { toPullRequestProps } from '../pull-request.ts';
import { fetchPullRequestWithFallback, githubAccess } from './pull-request.ts';
import { ensureRefreshTrigger } from './refresh.ts';
import { ensureRepo, findRepo, toRepoDescriptor } from './repo.ts';

/**
 * Import a pull request the user named, as the space's GitHub connection or anonymously.
 *
 * The object is filed through `SpaceOperation.AddObject` rather than added directly: an imported
 * pull request is something the user went looking for, so it belongs where they can find it again.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.ImportPullRequest> = GitHubOperation.ImportPullRequest.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ reference }) {
      const parsed = parsePullRequestReference(reference);
      if (!parsed) {
        return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
      }

      const { owner, repo, number } = parsed;
      const [existing] = yield* Database.query(Filter.type(PullRequest.PullRequest, { owner, repo, number })).run.pipe(
        Effect.orDie,
      );
      if (existing) {
        const known = yield* findRepo(owner, repo).pipe(Effect.orDie);
        return { pullRequest: Ref.make(existing), ...(known && { repo: Ref.make(known) }), imported: false };
      }

      const pull = yield* fetchPullRequestWithFallback(parsed, yield* githubAccess());

      const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
        object: PullRequest.make(toPullRequestProps(parsed, pull)),
      });
      // `AddObject` answers with what it filed, typed as any object; the narrowing is what makes the
      // returned ref a pull request's rather than a cast.
      if (!PullRequest.instanceOf(object)) {
        return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
      }

      // The first pull request a space holds is what makes refreshing them worth a schedule.
      yield* ensureRefreshTrigger().pipe(
        // The import already succeeded; a missing schedule is recovered the next time a pull request opens.
        Effect.catchDefect((defect) => Effect.sync(() => log.warn('refresh trigger setup failed', { defect }))),
      );

      const filed = pull.base?.repo
        ? yield* ensureRepo(toRepoDescriptor(pull.base.repo)).pipe(Effect.orDie)
        : undefined;
      if (filed) {
        Obj.update(object, (object) => {
          object.repository = Ref.make(filed);
        });
      }
      return { pullRequest: Ref.make(object), ...(filed && { repo: Ref.make(filed) }), imported: true };
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
