//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Database } from '@dxos/echo';
import { Card, useTranslation } from '@dxos/react-ui';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '#meta';

import { Header } from '../Header';
import { EventAttendee } from './EventAttendee';

export type EventDetailsProps = {
  event: EventType.Event;
  /** Title row: `'heading'` (article header h2 + icon), `'text'` (compact), or `false` to omit. */
  title?: 'heading' | 'text' | false;
  /** Render the description as a text row (compact preview cards). */
  description?: boolean;
  /** Maximum attendee rows shown; omit for all. */
  maxAttendees?: number;
  /** Render attendees as interactive contact buttons (resolves DXN + contact-create); default static text rows. */
  interactiveAttendees?: boolean;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

/**
 * Presentational event summary rendered as `Card` rows (title · date · description · attendees).
 * Shared by the Event article header, the calendar `EventCard`, and the `EventStack` tile so all three
 * render the same field layout; callers supply the surrounding Card chrome (`Header.Root`, `Card.Root`, …).
 */
export const EventDetails = ({
  event,
  title = 'heading',
  description = false,
  maxAttendees,
  interactiveAttendees = false,
  db,
  onContactCreate,
}: EventDetailsProps) => {
  const { t } = useTranslation(meta.id);
  const attendees = maxAttendees != null ? event.attendees.slice(0, maxAttendees) : event.attendees;

  return (
    <>
      {title === 'heading' && (
        <Header.Title icon='ph--check--regular' title={event.title ?? t('event-untitled.label')} />
      )}
      {title === 'text' && (
        <Card.Row>
          <Card.Text>{event.title ?? t('event-untitled.label')}</Card.Text>
        </Card.Row>
      )}

      <Header.Date start={new Date(event.startDate)} end={new Date(event.endDate)} />

      {description && event.description && (
        <Card.Row>
          <Card.Text variant='description'>{event.description}</Card.Text>
        </Card.Row>
      )}

      {attendees.map((attendee, index) =>
        interactiveAttendees ? (
          <EventAttendee key={attendee.email ?? index} attendee={attendee} db={db} onContactCreate={onContactCreate} />
        ) : (
          <Header.Row key={attendee.email ?? index} compact icon='ph--user--regular'>
            <span className='truncate text-description'>{attendee.name ?? attendee.email}</span>
          </Header.Row>
        ),
      )}
    </>
  );
};
