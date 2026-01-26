//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '../meta';

import * as Outline from './Outline';

const OUTLINER_OPERATION = `${meta.id}/operation`;

export namespace OutlineOperation {
  export const CreateOutline = Operation.make({
    meta: { key: `${OUTLINER_OPERATION}/create-outline`, name: 'Create Outline' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Outline.Outline,
      }),
    },
  });
}
