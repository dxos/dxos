//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CONDUCTOR_PLUGIN } from './meta';

export namespace ConductorAction {
  const CONDUCTOR_ACTION = `${CONDUCTOR_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${CONDUCTOR_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: CanvasBoardType,
    }),
  }) {}
}
