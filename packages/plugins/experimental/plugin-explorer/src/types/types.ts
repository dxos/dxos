//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ViewType } from './schema';
import { EXPLORER_PLUGIN } from '../meta';

export namespace ExplorerAction {
  const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${EXPLORER_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: ViewType,
    }),
  }) {}
}
