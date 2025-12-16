//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

import { LLM_PROVIDERS } from './defs';

/**
 * AI chat.
 */
export const Chat = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  // TODO(dmaretskyi): Eventually this and the message queue will be the same.
  traceQueue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/assistant/Chat',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Chat extends Schema.Schema.Type<typeof Chat> {}

export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export const CompanionTo = Schema.Struct({
  id: Obj.ID,
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
