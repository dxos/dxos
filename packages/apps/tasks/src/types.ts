//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

export type TaskProps = {
  title: string;
  completed: boolean;
};

export class TaskType extends EchoObjectSchema({ typename: 'dxos.app.tasks.Task', version: '0.1.0' })({
  title: S.string,
  completed: S.boolean,
}) {}
