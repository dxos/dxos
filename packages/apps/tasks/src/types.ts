//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

export type TaskProps = {
  title: string;
  completed: boolean;
};

const Task = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.def({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
);

export type Task = Schema.Schema.Type<typeof Task>;
