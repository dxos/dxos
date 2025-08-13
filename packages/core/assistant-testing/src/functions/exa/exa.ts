//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';
import Exa from 'exa-js';

import { CredentialsService, defineFunction } from '@dxos/functions';

export default defineFunction({
  name: 'dxos.org/function/exa',
  description: 'Search the web for information',
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fnUntraced(function* ({ data: { query } }) {
    const credential = yield* CredentialsService.getCredential({ service: 'exa.ai' });
    const exa = new Exa(credential.apiKey);

    const context = yield* Effect.promise(async () =>
      exa.searchAndContents(query, {
        type: 'auto',
        text: {
          maxCharacters: 3_000,
        },
        livecrawl: 'always',
      }),
    );

    return context;
  }),
});
