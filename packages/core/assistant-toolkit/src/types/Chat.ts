//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

/**
 * AI chat.
 */
export const Chat = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  queue: Ref.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  // TODO(dmaretskyi): Eventually this and the message queue will be the same.
  traceQueue: Ref.Ref(Queue).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/assistant/Chat',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--atom--regular',
    hue: 'blue',
  }),
);

export interface Chat extends Schema.Schema.Type<typeof Chat> {}

export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export const CompanionTo = Schema.Struct({
  id: Obj.ID,
}).pipe(
  Type.relation({
    typename: 'dxos.org/relation/assistant/CompanionTo',
    version: '0.1.0',
    source: Chat,
    target: Type.Obj,
  }),
);

export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}
