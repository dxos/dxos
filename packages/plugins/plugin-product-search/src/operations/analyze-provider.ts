//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { SearchOperation } from '../types';
import { cleanHtml, fetchViaProxy } from '../util';

// Bound the cleaned page handed to the LLM (≈ token budget). Rendered SPA pages can be multiple MB
// raw; `cleanHtml` strips scripts/styles/noise so the model sees the repeating listing structure.
const MAX_BODY_LENGTH = 64_000;

const handler: Operation.WithHandler<typeof SearchOperation.AnalyzeProvider> = SearchOperation.AnalyzeProvider.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ provider: providerRef }) {
      const provider = yield* Database.load(providerRef);
      const body = yield* fetchViaProxy({ method: 'GET', url: provider.url });
      return cleanHtml(body, { maxLength: MAX_BODY_LENGTH });
    }),
  ),
);

export default handler;
