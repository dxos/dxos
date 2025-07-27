//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

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
