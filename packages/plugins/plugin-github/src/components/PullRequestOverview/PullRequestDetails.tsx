//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** What the overview's details section shows, as a read-only form: one row per fact about the pull request. */
export const PullRequestDetailsSchema = Schema.Struct({
  reference: Schema.String.annotate({ title: 'Pull request' }),
  state: Schema.optional(Schema.String.annotate({ title: 'State' })),
  checks: Schema.optional(Schema.String.annotate({ title: 'Checks' })),
  branches: Schema.optional(Schema.String.annotate({ title: 'Branches' })),
});

export type PullRequestDetailsValues = Schema.Schema.Type<typeof PullRequestDetailsSchema>;
