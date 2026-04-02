//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

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
}).pipe(
  Type.object({
    typename: 'org.dxos.type.assistant.chat',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--atom--regular',
    hue: 'sky',
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
    typename: 'org.dxos.relation.assistant.companionTo',
    version: '0.1.0',
    source: Chat,
    target: Obj.Unknown,
  }),
);

export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}
