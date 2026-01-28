//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';

/**
 * Initiative schema definition.
 */
export const Initiative = Schema.Struct({
  name: Schema.String,
  artifacts: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      data: Type.Ref(Obj.Any),
    }),
  ),

  // TODO(dmaretskyi): Consider using chat type.
  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Type.Ref(Queue)),

  // TODO(dmaretskyi): Triggers & input queue.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Initiative',
    version: '0.1.0',
  }),
);
export interface Initiative extends Schema.Schema.Type<typeof Initiative> {}

export const SPEC_ARTIFACT_NAME = 'Spec';

export const PLAN_ARTIFACT_NAME = 'Plan';
