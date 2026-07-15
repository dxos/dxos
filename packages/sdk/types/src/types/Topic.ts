//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

// The field shape shared by a persisted `Topic` and an unaccepted `Mailbox.topicSuggestions` entry —
// extracted so promotion is `Obj.make(Topic, suggestion)` with no mapping. Kept free of annotations so
// referencing it (e.g. from `Mailbox.topicSuggestions`) does not alter that schema's serialization.
export const Props = Schema.Struct({
  label: Schema.String,
  summary: Schema.String,
  // TODO(burdon): Model via Relations?
  threadIds: Schema.Array(Schema.String),
  participants: Schema.Array(Schema.String),
  keywords: Schema.Array(Schema.String),
  // Open questions and action items rolled up from the topic's member threads.
  questions: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.String),
});

/**
 * A meta-thread: a cluster of related conversations with an optional label/summary. Authoritative in
 * ECHO; string-keyed thread references (like `Thread.messageIds`) until the entity layer firms up to
 * DXN refs.
 */
// TODO(burdon): Generalize beyond email (threads, task lists); reconcile with Project.
export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.topic', '0.1.0'))(
  Props.pipe(
    Schema.annotations({ title: 'Topic' }),
    LabelAnnotation.set(['label']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'rose' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Topic}. */
export const make = (props: Partial<Obj.MakeProps<typeof Topic>> = {}): Topic =>
  Obj.make(Topic, {
    label: '',
    summary: '',
    threadIds: [],
    participants: [],
    keywords: [],
    questions: [],
    tasks: [],
    ...props,
  });
