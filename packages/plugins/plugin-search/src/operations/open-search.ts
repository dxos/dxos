//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SEARCH_DIALOG } from '../constants';
import { SearchOperation } from '../types';

const handler: Operation.WithHandler<typeof SearchOperation.OpenSearch> = SearchOperation.OpenSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: SEARCH_DIALOG,
        blockAlign: 'start',
      });
    }),
  ),
);

export default handler;
