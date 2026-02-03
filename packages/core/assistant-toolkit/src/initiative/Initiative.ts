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

  spec: Type.Ref(Text.Text),
  plan: Type.Ref(Text.Text),

  artifacts: Schema.Array(
    Schema.Struct({
      // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
      name: Schema.String,
      data: Type.Ref(Type.Obj),
    }),
  ),

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Type.Ref(Chat.Chat)),

  /**
   * Objects to subscribe to.
   * References to objects with a a canonical queue property.
   * Schema must have the QueueAnnotation.
   */
  // TODO(dmaretskyi): Turn into an array of objects when form-data
  subscriptions: Schema.Array(Type.Ref(Type.Obj)),

  // TODO(dmaretskyi): input queue?
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Initiative',
    version: '0.1.0',
  }),
);
export interface Initiative extends Schema.Schema.Type<typeof Initiative> {}
