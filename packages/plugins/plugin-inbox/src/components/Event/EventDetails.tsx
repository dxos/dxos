//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Database } from '@dxos/echo';
import { Card, useTranslation } from '@dxos/react-ui';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '#meta';

import { Header } from '../Header';
import { EventEditor } from './EventEditor';

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
}: EventDetailsProps) => {
  const { t } = useTranslation(meta.id);
  const attendees = maxAttendees != null ? event.attendees.slice(0, maxAttendees) : event.attendees;

  if (editable) {
    return <EventEditor event={event} db={db} onContactCreate={onContactCreate} />;
  }

  return (
    <>
      {title === 'heading' && (
        <Card.Row icon='ph--check--regular'>
          <h2 className='text-lg line-clamp-2'>{event.title ?? t('event-untitled.label')}</h2>
        </Card.Row>
      )}
      {title === 'text' && (
        <Card.Row>
          <Card.Text>{event.title ?? t('event-untitled.label')}</Card.Text>
        </Card.Row>
      )}

      <Header.DateRow start={new Date(event.startDate)} end={new Date(event.endDate)} />

      {description && event.description && (
        <Card.Row>
          <Card.Text variant='description'>{event.description}</Card.Text>
        </Card.Row>
      )}

      {attendees.map((attendee, index) => (
        <Header.PersonRow key={attendee.email ?? index} actor={attendee} db={db} onContactCreate={onContactCreate} />
      ))}
    </>
  );
};
