//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import Exa from 'exa-js';

import { CredentialsService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { ExaSearch } from './definitions';

export default ExaSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ query }) {
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
  ),
);
