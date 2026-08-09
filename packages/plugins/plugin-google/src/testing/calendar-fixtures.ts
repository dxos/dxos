//
// Copyright 2026 DXOS.org
//

import { addDays, addHours } from 'date-fns';

import { type GoogleCalendar } from '../apis';
import { type CalendarDataset } from '../services';

export type GenerateCalendarDatasetOptions = {
  /** Remote calendar id the events belong to. */
  calendarId?: string;
  /** How many events to generate. */
  count?: number;
  /**
   * Reference instant the schedule is laid out around. Defaults to the wall clock because the sync
   * windows against it (`addDays(new Date(), ±syncDays)`) — a pinned past date yields events the sync
   * correctly refuses to fetch. Offsets from `now` are fixed, so runs stay comparable.
   */
  now?: Date;
  /** Days between consecutive events — negative values land them in the past. */
  strideDays?: number;
  /** `updated` stamp for every event; drives the incremental (`updatedMin`) path. */
  updated?: Date;
};

/**
 * Google Calendar events for {@link GoogleCalendarApi.mock} — the calendar peer of
 * `generateGmailDataset`. No randomness: every field derives from `now` and the index, so two runs with
 * the same `now` produce identical events.
 */
export const generateCalendarDataset = ({
  calendarId = 'primary',
  count = 5,
  now = new Date(),
  strideDays = 1,
  updated = now,
}: GenerateCalendarDatasetOptions = {}): CalendarDataset => {
  const events: GoogleCalendar.Event[] = Array.from({ length: count }, (_unused, index) => {
    const start = addDays(now, index * strideDays);
    return {
      id: `event-${index}`,
      summary: `Event ${index}`,
      description: `Generated event ${index}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: addHours(start, 1).toISOString() },
      updated: updated.toISOString(),
      organizer: { email: `organizer${index}@example.com`, displayName: `Organizer ${index}` },
    };
  });

  return { events: { [calendarId]: events } };
};

/**
 * A recurring series expanded into instances, all sharing `recurringEventId` — what the initial sync's
 * `singleEvents=true` window returns, and what `makeRecurringDedupStage` collapses to one event.
 */
export const generateRecurringSeries = ({
  calendarId = 'primary',
  count = 3,
  now = new Date(),
  seriesId = 'series-1',
}: Omit<GenerateCalendarDatasetOptions, 'strideDays'> & { seriesId?: string } = {}): CalendarDataset => {
  const events: GoogleCalendar.Event[] = Array.from({ length: count }, (_unused, index) => {
    const start = addDays(now, index * 7);
    return {
      id: `${seriesId}_${index}`,
      recurringEventId: seriesId,
      summary: 'Weekly standup',
      start: { dateTime: start.toISOString() },
      end: { dateTime: addHours(start, 1).toISOString() },
      updated: now.toISOString(),
    };
  });

  return { events: { [calendarId]: events } };
};
