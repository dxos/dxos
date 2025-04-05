//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { TaskType } from './task';
import { TreeNodeType, TreeType } from './tree';
import { JournalType, OutlineType } from './types';
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
      object: OutlineType,
    }),
  }) {}

  export class CreateTree extends S.TaggedClass<CreateTree>()(`${OUTLINER_ACTION}/create-tree`, {
    input: S.Void,
    output: S.Struct({
      object: TreeType,
    }),
  }) {}

  // TODO(burdon): Move to plugin-task.
  export class CreateTask extends S.TaggedClass<CreateOutline>()(`${OUTLINER_ACTION}/create-task`, {
    input: S.Struct({
      node: TreeNodeType,
    }),
    output: S.Struct({
      object: TaskType,
    }),
  }) {}
}
