//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Coordinates needed to fetch a pull request's diff from the GitHub REST API.
 * Stored inline so the diff-fetch operation does not have to re-derive them from
 * the Task's foreign keys (which hold the issue id, not the PR number).
 */
export const PullRequestMetadata = Schema.Struct({
  /** Repository owner login (e.g. `dxos`). */
  owner: Schema.String,
  /** Repository name without the owner (e.g. `dxos`). */
  repo: Schema.String,
  /** Pull request number as shown in the GitHub UI (distinct from the issue id). */
  number: Schema.Number,
  /** Canonical GitHub URL for the pull request. */
  url: Schema.optional(Schema.String),
});

export interface PullRequestMetadata extends Schema.Schema.Type<typeof PullRequestMetadata> {}

/**
 * Marks a synced Task as backing a GitHub pull request (rather than a plain
 * issue) and carries the coordinates used to fetch its diff. GitHub returns PRs
 * through the same issues endpoint, so the base {@link Task} schema has no field
 * to distinguish them — we annotate the instance instead of widening the shared
 * SDK type. Presence of this annotation is the PR predicate.
 */
export const PullRequestAnnotation = Annotation.make<PullRequestMetadata>({
  id: `${meta.profile.key}.annotation.pullRequest`,
  schema: PullRequestMetadata,
});
