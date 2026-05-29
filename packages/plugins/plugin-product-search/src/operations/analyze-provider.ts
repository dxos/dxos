//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { SearchOperation } from '../types';
import { fetchViaProxy } from '../util';

const MAX_BODY_LENGTH = 50_000;

const handler: Operation.WithHandler<typeof SearchOperation.AnalyzeProvider> = SearchOperation.AnalyzeProvider.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ provider: providerRef }) {
      const provider = yield* Database.load(providerRef);
      const body = yield* fetchViaProxy({ method: 'GET', url: provider.url });
      return body.length > MAX_BODY_LENGTH ? body.slice(0, MAX_BODY_LENGTH) : body;
    }),
  ),
);

export default handler;
