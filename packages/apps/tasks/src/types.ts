//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '@dxos/echo-schema';

export type TaskProps = {
  title: string;
  completed: boolean;
};

export class TaskType extends TypedObject({ typename: 'dxos.app.tasks.Task', version: '0.1.0' })({
  title: S.string,
  completed: S.boolean,
}) {}
