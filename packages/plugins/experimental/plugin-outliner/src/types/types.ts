//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { TreeType } from './tree';
import { OUTLINER_PLUGIN } from '../meta';

export namespace OutlinerAction {
  const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${OUTLINER_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TreeType,
    }),
  }) {}
}
