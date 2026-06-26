//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { DescriptionAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type MakeOptional } from '@dxos/util';

import * as Actor from './Actor';
import * as Geo from './Geo';

/**
 * https://schema.org/Event
 */
export class Event extends Type.makeObject<Event>(DXN.make('org.dxos.type.event', '0.1.0'))(
  Schema.Struct({
    id: Obj.ID,
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    owner: Actor.Actor,
    attendees: Schema.Array(Actor.Actor),
    startDate: Schema.String, // TODO(burdon): Date.
    endDate: Schema.String,

    /**
     * Whether the event spans whole days (no time-of-day). Maps to Google Calendar `start.date`/`end.date`
     * rather than `start.dateTime`/`end.dateTime`.
     */
    allDay: Schema.optional(Schema.Boolean),

    /**
     * Physical location of the event (https://schema.org/Event `location`).
     */
    location: Schema.optional(Geo.PostalAddress),

    // TODO(burdon): Video link(s).
  }).pipe(
    LabelAnnotation.set(['title']),
    DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--calendar-dot--regular', hue: 'rose' }),
  ),
) {}

export type MakeProps = MakeOptional<Obj.MakeProps<typeof Event>, 'attendees'>;

export const make = ({ attendees = [], ...props }: MakeProps): Event => Obj.make(Event, { attendees, ...props });
