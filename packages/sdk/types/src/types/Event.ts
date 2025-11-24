//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
>>>>>>> main
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
<<<<<<< HEAD
  transcript: Type.Ref(Transcript.Transcript).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  transcript: Type.Ref(Transcript.Transcript).pipe(FormAnnotation.set(false), Schema.optional),
=======
  transcript: Type.Ref(Transcript.Transcript).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main

  /**
   * Markdown notes for the meeting.
   */
<<<<<<< HEAD
  notes: Type.Ref(Text.Text).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  notes: Type.Ref(Text.Text).pipe(FormAnnotation.set(false), Schema.optional),
=======
  notes: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main

  /**
   * Generated summary of the meeting.
   */
<<<<<<< HEAD
  summary: Type.Ref(Text.Text).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  summary: Type.Ref(Text.Text).pipe(FormAnnotation.set(false), Schema.optional),
=======
  summary: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main

  /**
   * Message thread for the meeting.
   */
<<<<<<< HEAD
  thread: Type.Ref(Thread.Thread).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  thread: Type.Ref(Thread.Thread).pipe(FormAnnotation.set(false), Schema.optional),
=======
  thread: Type.Ref(Thread.Thread).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
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
