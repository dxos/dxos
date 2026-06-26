//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, EID, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Text } from '@dxos/schema';
import { Event, Transcript } from '@dxos/types';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export class Meeting extends Type.makeObject<Meeting>(DXN.make('org.dxos.type.meeting', '0.1.0'))(
  Schema.Struct({
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
     * The calendar event this meeting is for, if any. A `Ref` (not a relation) so it can point at a
     * feed/queue event synced from the calendar — relation endpoints require live db objects.
     */
    event: Ref.Ref(Event.Event).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--handshake--regular', hue: 'yellow' }),
  ),
) {}

/**
 * Selects the meeting (from an already-resolved list) whose `event` ref points at the given event,
 * or `undefined` if none exists. Pure and synchronous so it can run inside app-graph extension
 * callbacks (executed with `Effect.runSync`, which cannot await a query).
 * Matches by entity ID rather than full URI so refs stored as either the local (`echo:/ID`) or
 * space-qualified (`echo://SPACEID/ID`) form both match correctly.
 * At most one meeting is expected per event.
 */
export const findMeetingForEvent = (meetings: readonly Meeting[], event: Event.Event): Meeting | undefined => {
  const eventEid = EID.tryParse(Obj.getURI(event));
  const eventEntityId = eventEid ? EID.getEntityId(eventEid) : undefined;
  if (!eventEntityId) {
    return undefined;
  }
  return meetings.find((meeting) => {
    const refUri = meeting.event?.uri;
    if (!refUri) {
      return false;
    }
    const refEid = EID.tryParse(refUri);
    return refEid != null && EID.getEntityId(refEid) === eventEntityId;
  });
};
