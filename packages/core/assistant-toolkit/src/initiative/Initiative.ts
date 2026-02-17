//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { QueueAnnotation, Text } from '@dxos/schema';

import * as Chat from '../chat/Chat';
import { Plan } from './plan';

/**
 * Initiative schema definition.
 */
export const Initiative = Schema.Struct({
  name: Schema.String,

  spec: Type.Ref(Text.Text),
  plan: Type.Ref(Plan),

  artifacts: Schema.Array(
    Schema.Struct({
      // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
      name: Schema.String,
      data: Type.Ref(Type.Obj),
    }),
  ),

  /**
   * Incoming queue that the agent processes.
   */
  // NOTE: Named `queue` to conform to subscribable schema (see QueueAnnotation).
  queue: Schema.optional(Type.Ref(Queue)),

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Type.Ref(Chat.Chat)),

  /**
   * Objects to subscribe to.
   * References to objects with a a canonical queue property.
   * Schema must have the QueueAnnotation.
   */
  // TODO(dmaretskyi): Turn into an array of objects when form-data
  subscriptions: Schema.Array(Type.Ref(Type.Obj)),

  useQualifyingAgent: Schema.optional(Schema.Boolean),

  newChatOnEveryEvent: Schema.optional(Schema.Boolean),

  // TODO(dmaretskyi): input queue?
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Initiative',
    version: '0.1.0',
  }),
  QueueAnnotation.set(true),
);
export interface Initiative extends Schema.Schema.Type<typeof Initiative> {}
