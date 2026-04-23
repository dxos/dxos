//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

export const Fetch = Operation.make({
  meta: {
    key: 'org.dxos.function.web-search.fetch',
    name: 'Fetch web page',
    description: trim`
      Fetches the content of a web page and returns the HTML. 
      Use this to get the content of a web page.
    `,
  },
  input: Schema.Struct({
    url: Schema.String.annotations({
      description: 'The URL of the web page to fetch.',
    }),
  }),
  output: Schema.String,
});
