//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextBinder, type ContextBinding } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Ref, Relation, Type } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Text } from '@dxos/schema';
import type { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Chat from '../chat/Chat';

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

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Type.Ref(Chat.Chat)),

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
