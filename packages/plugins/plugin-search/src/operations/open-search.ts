//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { OpenSearch } from './definitions';

const handler: Operation.WithHandler<typeof OpenSearch> = OpenSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateComplementary, { subject: 'search' });
    }),
  ),
);

export default handler;
