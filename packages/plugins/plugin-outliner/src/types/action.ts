//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { DataType } from '@dxos/schema';

import { JournalType, OutlineType } from './schema';
import { OUTLINER_PLUGIN } from '../meta';

export namespace OutlinerAction {
  const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

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
