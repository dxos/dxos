//
// Copyright 2022 DXOS.org
//

import { DocumentBase, TypeFilter, EchoSchema } from "@dxos/react-client";

export const schema = EchoSchema.fromJson('{ "protobuf generated json here": true }');

export class Task extends DocumentBase {
  static readonly type = schema.getType('dxos.tasks.Task');

  static filter(opts?: { title?: string, completed?: boolean, previous?: Task }): TypeFilter<Task> {
    return Task.type.createFilter(opts);
  }

  constructor(opts?: { title?: string, completed?: boolean, previous?: Task }) {
    super({ ...opts, '@type': Task.type.name }, Task.type);
  }

  declare title: string;
  declare completed: boolean;
}