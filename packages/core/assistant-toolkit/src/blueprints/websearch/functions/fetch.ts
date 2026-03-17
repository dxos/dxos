//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'org.dxos.function.web-search.fetch',
  name: 'Fetch web page',
  description: trim`
    Fetches the content of a web page and returns the HTML. 
    Use this to get the content of a web page.
  `,
  inputSchema: Schema.Struct({
    url: Schema.String.annotations({
      description: 'The URL of the web page to fetch.',
    }),
  }),
  outputSchema: Schema.String,
  handler: Effect.fn(function* ({ data: { url } }) {
    const response = yield* Effect.promise(() => fetch(url).then((response) => response.text()));
    return response;
  }),
});
