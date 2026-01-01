//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { meta } from '../meta';

export namespace ConductorAction {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: CanvasBoardType,
    }),
  }) {}
}

const CONDUCTOR_OPERATION = `${meta.id}/operation`;

export namespace ConductorOperation {
  export const Create = Operation.make({
    meta: { key: `${CONDUCTOR_OPERATION}/create`, name: 'Create Conductor Board' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: CanvasBoardType,
      }),
    },
  });
}
