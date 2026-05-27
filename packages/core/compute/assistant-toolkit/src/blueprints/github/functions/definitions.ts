//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as Schema from 'effect/Schema';

import { Credential, Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

export const FetchPrs = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.github.fetch-prs'),
    name: 'Fetch PRs',
    description: 'Fetches PRs from GitHub.',
    icon: 'ph--github-logo--regular',
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
  services: [Credential.CredentialsService, HttpClient.HttpClient],
});
