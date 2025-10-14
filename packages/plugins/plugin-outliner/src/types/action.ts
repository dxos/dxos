//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DataType } from '@dxos/schema';

import { meta } from '../meta';

import { JournalType, OutlineType } from './schema';

export namespace OutlinerAction {
  const OUTLINER_ACTION = `${meta.id}/action`;

  export class CreateJournal extends Schema.TaggedClass<CreateJournal>()(`${OUTLINER_ACTION}/create-journal`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: JournalType,
    }),
  }) {}

  export class CreateOutline extends Schema.TaggedClass<CreateOutline>()(`${OUTLINER_ACTION}/create-outline`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: OutlineType,
    }),
  }) {}

  // TODO(burdon): Move to plugin-task.
  export class CreateTask extends Schema.TaggedClass<CreateTask>()(`${OUTLINER_ACTION}/create-task`, {
    input: Schema.Struct({
      text: Schema.String,
    }),
    output: Schema.Struct({
      object: DataType.Task,
    }),
  }) {}
}
