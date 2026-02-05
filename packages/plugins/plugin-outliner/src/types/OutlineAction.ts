//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

import * as Outline from './Outline';

const OUTLINER_OPERATION = `${meta.id}/operation`;

export namespace OutlinerOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${OUTLINER_OPERATION}/on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });
}

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
