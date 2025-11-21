//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Google Calendar API types.
 * https://developers.google.com/calendar/api/v3/reference/events
 */

export const DateTime = Schema.Struct({
  date: Schema.optional(Schema.String),
  dateTime: Schema.optional(Schema.String),
  timeZone: Schema.optional(Schema.String),
});

export const Attendee = Schema.Struct({
  id: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  organizer: Schema.optional(Schema.Boolean),
  self: Schema.optional(Schema.Boolean),
  resource: Schema.optional(Schema.Boolean),
  optional: Schema.optional(Schema.Boolean),
  responseStatus: Schema.optional(Schema.String),
  comment: Schema.optional(Schema.String),
});

export const Organizer = Schema.Struct({
  id: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  self: Schema.optional(Schema.Boolean),
});

export const Event = Schema.Struct({
  kind: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  id: Schema.String,
  status: Schema.optional(Schema.String),
  htmlLink: Schema.optional(Schema.String),
  created: Schema.optional(Schema.String),
  updated: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  creator: Schema.optional(Organizer),
  organizer: Schema.optional(Organizer),
  start: DateTime,
  end: Schema.optional(DateTime),
  recurrence: Schema.optional(Schema.Array(Schema.String)),
  recurringEventId: Schema.optional(Schema.String),
  attendees: Schema.optional(Schema.Array(Attendee)),
  eventType: Schema.optional(Schema.String),
});

export type Event = Schema.Schema.Type<typeof Event>;

export const ListEventsResponse = Schema.Struct({
  kind: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  updated: Schema.optional(Schema.String),
  timeZone: Schema.optional(Schema.String),
  items: Schema.Array(Event),
  nextPageToken: Schema.optional(Schema.String),
  nextSyncToken: Schema.optional(Schema.String),
});

export type ListEventsResponse = Schema.Schema.Type<typeof ListEventsResponse>;
