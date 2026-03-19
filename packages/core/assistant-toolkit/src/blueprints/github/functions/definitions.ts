//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as Schema from 'effect/Schema';

import { CredentialsService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

export const FetchPrs = Operation.make({
  meta: {
    key: 'org.dxos.function.github.fetch-prs',
    name: 'Fetch PRs',
    description: 'Fetches PRs from GitHub.',
  },
  input: Schema.Struct({
    owner: Schema.String.annotations({
      description: 'GitHub owner.',
    }),
    repo: Schema.String.annotations({
      description: 'GitHub repository.',
    }),
  }),
  output: Schema.Any,
  services: [CredentialsService, HttpClient.HttpClient],
});
