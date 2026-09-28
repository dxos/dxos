//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { GitHubOperation } from '#types';

import { GitHubPullRequestReferenceError } from '../errors.ts';
import { parsePullRequestReference } from '../github-link.ts';

/**
 * Import the pull request the extension's page is showing.
 *
 * The snapshot is read for its URL alone — the page's DOM says nothing GitHub's API does not say
 * better — and the import itself is delegated, so the anonymous fallback and the existing-object
 * check stay in one place.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.ImportPullRequestFromSnapshot> =
  GitHubOperation.ImportPullRequestFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const reference = snapshot.source.url;
        if (!parsePullRequestReference(reference)) {
          return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
        }

        const { pullRequest } = yield* Operation.invoke(
          GitHubOperation.ImportPullRequest,
          { reference },
          { spaceId: target.spaceId },
        );

        // The extension acks with an object id so the page can open what it just imported; a ref
        // whose target did not resolve would ack success on nothing.
        const object = pullRequest.target;
        if (!object) {
          return yield* Effect.die(new GitHubPullRequestReferenceError({ context: { reference } }));
        }

        return { id: object.id };
      }),
    ),
  );

export default handler;
