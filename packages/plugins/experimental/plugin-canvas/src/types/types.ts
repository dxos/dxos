//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { CanvasBoardType } from './schema';
import { CANVAS_PLUGIN } from '../meta';

export namespace CanvasAction {
  const CANVAS_ACTION = `${CANVAS_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CANVAS_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CanvasBoardType,
    }),
  }) {}
}
