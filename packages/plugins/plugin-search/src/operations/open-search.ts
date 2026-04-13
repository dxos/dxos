//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SEARCH_DIALOG } from '../constants';
import { OpenSearch } from './definitions';

const handler: Operation.WithHandler<typeof OpenSearch> = OpenSearch.pipe(
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
