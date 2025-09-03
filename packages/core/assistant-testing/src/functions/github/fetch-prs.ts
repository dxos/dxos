//
// Copyright 2025 DXOS.org
//

import { HttpClient } from '@effect/platform';
import { Effect, Schema } from 'effect';

import { defineFunction } from '@dxos/functions';

import { apiKeyAuth } from '../../util';

export default defineFunction({
  name: 'dxos.org/function/github/fetch-prs',
  description: 'Fetches PRs from GitHub.',
  inputSchema: Schema.Struct({
    owner: Schema.String.annotations({
      description: 'GitHub owner.',
    }),
    repo: Schema.String.annotations({
      description: 'GitHub repository.',
    }),
  }),
  handler: Effect.fnUntraced(function* ({ data }) {
    const client = yield* HttpClient.HttpClient.pipe(Effect.map(apiKeyAuth({ service: 'github.com' })));

    const response = yield* client.get(`https://api.github.com/repos/${data.owner}/${data.repo}/pulls`);
    const json: any = yield* response.json;
    return json;
  }),
});
