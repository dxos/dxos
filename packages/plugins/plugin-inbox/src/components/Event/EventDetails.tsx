//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Database, DXN, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, IconButton, useTranslation } from '@dxos/react-ui';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '#meta';

import { Row } from '../Row';
import { EventEditor } from './EventEditor';

// The hub `Meeting` type is owned by plugin-meeting; reference its typename by string so plugin-inbox
// stays meeting-agnostic (no package dependency). Anchored objects of other types are ignored here.
const MEETING_TYPENAME = 'org.dxos.type.meeting';

export type EventDetailsProps = {
  event: EventType.Event;
  /** Title row: `'heading'` (article header h2 + icon), `'text'` (compact), or `false` to omit. */
  title?: 'heading' | 'text' | false;
  /** Render the description as a text row (compact preview cards). */
  description?: boolean;
  /** Maximum attendee rows shown; omit for all. */
  maxAttendees?: number;
  /** Render an editable form (title · all-day · start · end/duration) — used for draft events. */
  editable?: boolean;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
  /** Navigate to an object anchored to this event (e.g. its Meeting). Chips are static when omitted. */
  onOpenObject?: (object: Obj.Unknown) => void;
  /** Whether the event is starred; shown as a filled star in the heading top-right. */
  starred?: boolean;
  /** Toggle the event's starred tag; the star toggle renders only when provided. */
  onToggleStar?: () => void;
};

/**
 * Presentational event summary rendered as `Card` rows (title · date · description · attendees).
 * Shared by the Event article header, the calendar `EventCard`, and the `EventStack` tile so all three
 * render the same field layout; callers supply the surrounding `Card.Root` chrome. When `editable`,
 * delegates to {@link EventEditor} for inline editing.
 */
export const EventDetails = ({
  event,
  title = 'heading',
  description = false,
  maxAttendees,
  editable = false,
  db,
  onContactCreate,
  onOpenObject,
  starred,
  onToggleStar,
}: EventDetailsProps) => {
  const { t } = useTranslation(meta.id);
  // Synced events are immutable feed snapshots (not LiveObjects), so read fields directly — `useObject`
  // requires a live object and throws on a snapshot. Inline draft editing is handled by EventEditor below.
  const data = event;
  const attendees = maxAttendees != null ? data.attendees.slice(0, maxAttendees) : data.attendees;

  // The Meeting for this event, if any — found by reverse-matching its `event` ref to this event's
  // URI. (A ref, not a relation, since the event is a feed object; queried by typename to keep
  // plugin-inbox free of a plugin-meeting dependency.) Only resolved on the interactive heading path:
  // EventDetails is shared by cards/tiles, so an unconditional query would subscribe every instance to
  // the full Meeting set just to discard it.
  const showMeeting = !editable && title === 'heading' && !!onOpenObject;
  const eventUri = Obj.getURI(event);
  const meetings = useQuery(db, showMeeting ? Filter.type(DXN.make(MEETING_TYPENAME)) : Filter.nothing());
  const meeting = showMeeting ? meetings.find((candidate) => candidate.event?.uri === eventUri) : undefined;

  if (editable) {
    return <EventEditor event={event} db={db} onContactCreate={onContactCreate} />;
  }

  // TODO(burdon): Refactor common elements with MessageStackTile.
  return (
    <>
      {title === 'heading' && (
        <Card.Row>
          <Card.Block>
            <Row.Star starred={starred} onToggle={onToggleStar} />
          </Card.Block>
          <Card.Text className='text-lg line-clamp-2'>{data.title ?? t('event-untitled.label')}</Card.Text>
          {meeting && (
            <IconButton
              iconOnly
              variant='ghost'
              icon='ph--handshake--regular'
              label={Obj.getLabel(meeting) ?? 'Meeting'}
              onClick={onOpenObject ? () => onOpenObject(meeting) : undefined}
            />
          )}
        </Card.Row>
      )}

      {title === 'text' && (
        <Card.Row>
          <Card.Block>
            <Row.Star starred={starred} onToggle={onToggleStar} />
          </Card.Block>
          <Card.Text>{data.title ?? t('event-untitled.label')}</Card.Text>
        </Card.Row>
      )}

      <Row.Date start={new Date(data.startDate)} end={new Date(data.endDate)} />

      {description && data.description && (
        <Card.Row>
          <Card.Text variant='description'>{data.description}</Card.Text>
        </Card.Row>
      )}

      {attendees.map((attendee, index) => (
        <Row.Person
          key={attendee.email ?? index}
          actor={attendee}
          role='attendee'
          db={db}
          onContactCreate={onContactCreate}
        />
      ))}
    </>
  );
};
