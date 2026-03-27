//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const JOURNAL_OPERATION = `${meta.id}.operation`;

export namespace JournalOperation {
  export const QuickEntry = Operation.make({
    meta: { key: `${JOURNAL_OPERATION}.quick-entry`, name: 'Quick Journal Entry' },
    schema: {
      input: Schema.Struct({
        text: Schema.String,
      }),
      output: Schema.Void,
    },
  });
}
