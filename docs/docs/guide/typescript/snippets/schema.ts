//
// Copyright 2022 DXOS.org
//

import { TypedObject, TypeFilter, TypeCollection, Schema } from '@dxos/react-client/echo';

export const schema = new TypeCollection();

export class Task extends TypedObject {
  declare static readonly schema: Schema;

  static filter(opts?: {
    title?: string;
    completed?: boolean;
  }): TypeFilter<Task> {
    return { ...opts, '@type': Task.schema.typename } as any
  }

  constructor(opts?: { title?: string; completed?: boolean }) {
    super({ ...opts, '@type': Task.schema.typename }, { schema: Task.schema });
  }

  declare title: string;
  declare completed: boolean;
}
