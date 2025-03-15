//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CONDUCTOR_PLUGIN } from './meta';

export namespace ConductorAction {
  const CONDUCTOR_ACTION = `${CONDUCTOR_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CONDUCTOR_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CanvasBoardType,
    }),
  }) {}
}
