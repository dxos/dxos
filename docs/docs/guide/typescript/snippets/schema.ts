//
// Copyright 2022 DXOS.org
//

import { TypedObject, TypeFilter, EchoSchema } from '@dxos/client/echo';

export const schema = EchoSchema.fromJson(
  '{ "protobuf generated json here": true }',
);

export class Task extends TypedObject {
  static readonly type: ReturnType<typeof schema.getType> =
    schema.getType('example.tasks.Task');

  static filter(opts?: {
    title?: string;
    completed?: boolean;
  }): TypeFilter<Task> {
    return Task.type.createFilter(opts);
  }

  constructor(opts?: { title?: string; completed?: boolean }) {
    super({ ...opts, '@type': Task.type.name }, { schema: Task.type });
  }

  declare title: string;
  declare completed: boolean;
}
