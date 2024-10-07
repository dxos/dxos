//
// Copyright 2024 DXOS.org
//

import { TypedObject, S } from '@dxos/echo-schema';

export class TaskType extends TypedObject({ typename: 'dxos.docs.Task', version: '0.1.0' })({
  title: S.String,
  completed: S.Boolean,
}) {}
