//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/schema';
import { Task } from '@dxos/types';

import { meta } from '../meta';

import * as Journal from './Journal';
import * as Outline from './Outline';

const OUTLINER_ACTION = `${meta.id}/action`;

export class CreateJournal extends Schema.TaggedClass<CreateJournal>()(`${OUTLINER_ACTION}/create-journal`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Journal.Journal,
  }),
}) {}

export class CreateOutline extends Schema.TaggedClass<CreateOutline>()(`${OUTLINER_ACTION}/create-outline`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Outline.Outline,
  }),
}) {}

// TODO(burdon): Move to plugin-task.
export class CreateTask extends Schema.TaggedClass<CreateTask>()(`${OUTLINER_ACTION}/create-task`, {
  input: Schema.Struct({
    text: Schema.String,
  }),
  output: Schema.Struct({
    object: Task.Task,
  }),
}) {}
