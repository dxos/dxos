//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Annotation, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Call } from '@dxos/plugin-calls/types';
import { Text } from '@dxos/schema';
import { AnchoredTo, type Event, Transcript } from '@dxos/types';

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
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--handshake--regular', hue: 'rose' }),
  Type.makeObject(DXN.make('org.dxos.type.meeting', '0.1.0')),
);

export type Meeting = Type.InstanceType<typeof Meeting>;

/**
 * Resolves the meeting anchored to the given event (via a `Meeting --AnchoredTo--> Event` relation),
 * or `undefined` if none exists. At most one meeting is expected per event.
 */
export const getMeetingForEvent = async (db: Database.Database, event: Event.Event): Promise<Meeting | undefined> => {
  const sources = await db.query(Query.select(Filter.id(event.id)).targetOf(AnchoredTo.AnchoredTo).source()).run();
  return sources.find((object): object is Meeting => Obj.instanceOf(Meeting, object));
};
