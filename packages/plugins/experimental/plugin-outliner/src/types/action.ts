//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { JournalType, TreeType } from './types';
import { OUTLINER_PLUGIN } from '../meta';

export namespace OutlinerAction {
  const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

  export class CreateJournal extends S.TaggedClass<CreateJournal>()(`${OUTLINER_ACTION}/create-journal`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: JournalType,
    }),
  }) {}

  export class CreateOutline extends S.TaggedClass<CreateOutline>()(`${OUTLINER_ACTION}/create-outline`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TreeType,
    }),
  }) {}
}
