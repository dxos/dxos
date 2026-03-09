//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

export const ResearchInputQueue = Schema.Struct({
  queue: Ref.Ref(Queue),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/ResearchInputQueue',
    version: '0.1.0',
  }),
);
