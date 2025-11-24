//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as Thread from './Thread';
import * as Transcript from './Transcript';

/**
 * https://schema.org/Event
 */
// TODO(burdon): Location (string | Ref<Place>)
export const Event = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  owner: Actor.Actor,
  attendees: Schema.mutable(Schema.Array(Actor.Actor)),
  startDate: Schema.String, // TODO(burdon): Date.
  endDate: Schema.String,

  /**
   * Transcript of the meeting.
   */
  transcript: Type.Ref(Transcript.Transcript).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),

  /**
   * Markdown notes for the meeting.
   */
  notes: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),

  /**
   * Generated summary of the meeting.
   */
  summary: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),

  /**
   * Message thread for the meeting.
   */
  thread: Type.Ref(Thread.Thread).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Event',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['title']),
  Annotation.DescriptionAnnotation.set('description'),
);

export interface Event extends Schema.Schema.Type<typeof Event> {}

export const make = ({ attendees = [], ...props }: MakeOptional<Obj.MakeProps<typeof Event>, 'attendees'>) =>
  Obj.make(Event, { attendees, ...props });
