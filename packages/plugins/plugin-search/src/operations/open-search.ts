//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { OpenSearch } from './definitions';

export default OpenSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateComplementary, { subject: 'search' });
    }),
  ),
);
