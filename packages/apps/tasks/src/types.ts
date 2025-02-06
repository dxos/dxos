//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { TypedObject } from '@dxos/echo-schema';

export type TaskProps = {
  title: string;
  completed: boolean;
};

export class TaskType extends TypedObject({ typename: 'example.com/type/Task', version: '0.1.0' })({
  title: S.String,
  completed: S.Boolean,
}) {}
