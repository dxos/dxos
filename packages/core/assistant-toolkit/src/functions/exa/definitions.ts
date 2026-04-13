//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { CredentialsService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

export const ExaSearch = Operation.make({
  meta: {
    key: 'org.dxos.function.exa-search',
    name: 'Exa Search',
    description: 'Search the web for information',
  },
  input: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),
  }),
  output: Schema.Unknown,
  services: [CredentialsService],
});

export const ExaMock = Operation.make({
  meta: {
    key: 'org.dxos.function.exa-mock',
    name: 'Exa mock',
    description: 'Search the web for information',
  },
  input: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),
  }),
  output: Schema.Unknown,
});
