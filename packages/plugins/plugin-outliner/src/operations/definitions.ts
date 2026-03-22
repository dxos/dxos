//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { Outline } from '../types';

const OUTLINER_OPERATION = `${meta.id}.operation`;

export const CreateOutline = Operation.make({
  meta: { key: `${OUTLINER_OPERATION}.create-outline`, name: 'Create Outline' },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Outline.Outline,
  }),
});
