//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { meta } from '../meta';

const PIPELINE_OPERATION = `${meta.id}/operation`;

export namespace PipelineOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${PIPELINE_OPERATION}/on-create-space`, name: 'On Create Space' },
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
