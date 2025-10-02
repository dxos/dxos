//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

export const ResearchInputQueue = Schema.Struct({
  queue: Type.Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ResearchInputQueue',
    version: '0.1.0',
  }),
);
