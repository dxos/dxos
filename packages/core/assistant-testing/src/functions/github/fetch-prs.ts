//
// Copyright 2025 DXOS.org
//

import { HttpClient } from '@effect/platform';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction, withAuthorization } from '@dxos/functions';

export default defineFunction({
  key: 'dxos.org/function/github/fetch-prs',
  name: 'Fetch PRs',
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
    const client = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization({ service: 'github.com' })));

    const response = yield* client.get(`https://api.github.com/repos/${data.owner}/${data.repo}/pulls`);
    const json: any = yield* response.json;
    return json;
  }),
});
