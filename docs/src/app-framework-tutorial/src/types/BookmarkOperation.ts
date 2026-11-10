//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';

// #region operation
export const RecordVisit = Operation.make({
  meta: {
    // eslint-disable-next-line @dxos/rules/operation-key-shape -- a reader's app owns no org.dxos domain.
    key: DXN.make('com.example.operation.bookmark.recordVisit'),
    name: 'Record visit',
    description: 'Count one visit to a bookmark.',
    icon: 'ph--cursor-click--regular',
  },
  input: Schema.Struct({
    bookmark: Schema.Any.annotate({ description: 'The bookmark that was visited.' }),
  }),
  output: Schema.Struct({
    visits: Schema.Number.annotate({ description: 'The visit count after this visit.' }),
  }),
});
// #endregion
