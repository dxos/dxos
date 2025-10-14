//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Queue } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';

import { LLM_PROVIDERS } from './defs';

/**
 * AI chat.
 */
export const Chat = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue),
  // TODO(dmaretskyi): Eventually this and the message queue will be the same.
  traceQueue: Schema.optional(Type.Ref(Queue)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/assistant/Chat',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Chat extends Schema.Schema.Type<typeof Chat> {}

/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export const CompanionTo = Schema.Struct({
  id: Type.ObjectId,
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/assistant/CompanionTo',
    version: '0.1.0',
    source: Chat,
    target: Type.Expando,
  }),
);

export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}

/**
 * Plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    llmProvider: Schema.optional(Schema.Literal(...LLM_PROVIDERS)),
    edgeModel: Schema.optional(Schema.String),
    ollamaModel: Schema.optional(Schema.String),
    lmstudioModel: Schema.optional(Schema.String),
    customPrompts: Schema.optional(Schema.Boolean),
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
