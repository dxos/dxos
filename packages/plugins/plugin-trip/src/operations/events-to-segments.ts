//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';

import { Database } from '@dxos/echo';
import { type Event } from '@dxos/types';

import { type Place } from '../types/Place';
import * as Segment from '../types/Segment';
import * as Trip from '../types/Trip';

/**
 * Maps a calendar Event's postal address onto the generic {@link Place} shape used by Segments.
 * Falls back to the event title for the place name when the address has no street/locality.
 */
const placeFromAddress = (address: NonNullable<Event.Event['location']>, fallbackName?: string): Place => ({
  name: address.street ?? address.locality ?? fallbackName,
  city: address.locality,
  country: address.country,
});

/**
 * Projects calendar Events onto `activity` Segments. Only events that have a `location` become
 * segments — an event without an address is not an itinerary stop. The returned Segments are
 * detached ECHO objects; the caller is responsible for adding them to a database and attaching them
 * to a Trip.
 */
export const eventsToSegments = (events: readonly Event.Event[]): Segment.Segment[] => {
  const segments: Segment.Segment[] = [];
  for (const event of events) {
    const location = event.location;
    if (!location) {
      continue;
    }
    segments.push(
      Segment.make({
        details: {
          _tag: 'activity',
          title: event.title,
          venue: placeFromAddress(location, event.title),
          departAt: event.startDate,
          arriveAt: event.endDate,
        },
      }),
    );
  }
  return segments;
};

/**
 * Computes the trip span (earliest start, latest end) across a set of events. ISO 8601 strings
 * compare lexicographically, so plain string comparison yields chronological order.
 */
export const eventsSpan = (events: readonly Event.Event[]): { start?: string; end?: string } => {
  let start: string | undefined;
  let end: string | undefined;
  for (const event of events) {
    if (event.startDate && (!start || event.startDate < start)) {
      start = event.startDate;
    }
    const finish = event.endDate || event.startDate;
    if (finish && (!end || finish > end)) {
      end = finish;
    }
  }
  return { start, end };
};

// Parses the calendar-day portion of an ISO timestamp into a local Date (constructed from the
// y/m/d parts so it is not shifted across day boundaries by the runtime timezone).
const toCalendarDay = (iso?: string): Date | undefined => {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!match) {
    return undefined;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Default trip name derived from the span, e.g. "Trip · Jun 8 – Jun 14". */
export const defaultTripName = (start?: string, end?: string): string => {
  const startDate = toCalendarDay(start);
  const endDate = toCalendarDay(end);
  if (startDate && endDate) {
    return `Trip · ${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`;
  }
  if (startDate) {
    return `Trip · ${format(startDate, 'MMM d')}`;
  }
  return 'Trip';
};

/**
 * Creates a Trip from a set of events and persists it (plus its activity segments) to `db`. The Trip
 * spans the events; its name defaults from the span when none is given. Pure of any UI/assistant
 * concerns so it can be exercised directly against a test database.
 */
export const buildTripFromEvents = (db: Database.Database, events: readonly Event.Event[], name?: string): Trip.Trip => {
  const span = eventsSpan(events);
  const trip = db.add(
    Trip.make({ name: name ?? defaultTripName(span.start, span.end), start: span.start, end: span.end }),
  );
  for (const segment of eventsToSegments(events)) {
    db.add(segment);
    Trip.addSegment(trip, segment);
  }
  return trip;
};
