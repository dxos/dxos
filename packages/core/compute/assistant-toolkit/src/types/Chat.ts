//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

/**
 * AI chat.
 */
export const Chat = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  view: Schema.String.pipe(Schema.optional),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--sparkle--regular',
    hue: 'sky',
  }),
  Type.makeObject(DXN.make('org.dxos.type.assistant.chat', '0.1.0')),
);

export type Chat = Type.InstanceType<typeof Chat>;
export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

/** @deprecated Use CompanionTo instead. */
export const LegacyCompanionTo = Schema.Struct({
  id: Obj.ID,
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
    source: Chat,
    target: Obj.Unknown,
  }),
);

export type LegacyCompanionTo = Type.InstanceType<typeof LegacyCompanionTo>;
/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export const CompanionTo = Schema.Struct({
  id: Obj.ID,
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
    source: Chat,
    target: Obj.Unknown,
  }),
);

export type CompanionTo = Type.InstanceType<typeof CompanionTo>;
