//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Call } from '@dxos/plugin-calls/types';
import { Text } from '@dxos/schema';
import { Event, Transcript } from '@dxos/types';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const Meeting = Schema.Struct({
  /**
   * User-defined name of the meeting.
   */
  name: Schema.String.pipe(Schema.optional),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.Array(IdentityDidSchema).pipe(FormInputAnnotation.set(false)),

  /**
   * Transcript of the meeting.
   */
  transcript: Ref.Ref(Transcript.Transcript).pipe(FormInputAnnotation.set(false)),

  /**
   * Markdown notes for the meeting.
   */
  notes: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),

  /**
   * Generated summary of the meeting.
   */
  summary: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),

  /**
   * Optional live call/room for the meeting (in-person and external meetings have none).
   * At most one per meeting; provisioned ahead and resumable.
   */
  call: Ref.Ref(Call.Call).pipe(FormInputAnnotation.set(false), Schema.optional),

  /**
   * The calendar event this meeting is for, if any. A `Ref` (not a relation) so it can point at a
   * feed/queue event synced from the calendar — relation endpoints require live db objects.
   */
  event: Ref.Ref(Event.Event).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--handshake--regular', hue: 'yellow' }),
  Type.makeObject(DXN.make('org.dxos.type.meeting', '0.1.0')),
);

export type Meeting = Type.InstanceType<typeof Meeting>;

/**
 * Selects the meeting (from an already-resolved list) whose `event` ref points at the given event,
 * or `undefined` if none exists. Pure and synchronous so it can run inside app-graph extension
 * callbacks (executed with `Effect.runSync`, which cannot await a query).
 * Matches by ref DXN so it works for feed/queue events. At most one meeting is expected per event.
 */
export const findMeetingForEvent = (meetings: readonly Meeting[], event: Event.Event): Meeting | undefined => {
  const eventUri = Obj.getURI(event);
  return meetings.find((meeting) => meeting.event?.uri === eventUri);
};
