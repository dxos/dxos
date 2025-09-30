//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo/internal';

export class TaskType extends TypedObject({ typename: 'dxos.docs.Task', version: '0.1.0' })({
  title: Schema.String,
  completed: Schema.Boolean,
}) {}
