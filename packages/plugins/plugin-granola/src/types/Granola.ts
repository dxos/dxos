//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Markdown } from '@dxos/plugin-markdown/types';

// @import-as-namespace

/** Attendee of a Granola meeting. */
export const Attendee = Schema.Struct({
  name: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
});

export type Attendee = Schema.Schema.Type<typeof Attendee>;

/** Calendar event metadata. */
export const CalendarEvent = Schema.Struct({
  title: Schema.optional(Schema.String),
  eventId: Schema.optional(Schema.String),
  organizerEmail: Schema.optional(Schema.String),
  startTime: Schema.optional(Schema.String),
  endTime: Schema.optional(Schema.String),
});

export type CalendarEvent = Schema.Schema.Type<typeof CalendarEvent>;

/**
 * Lightweight sync record that links a Granola note ID to a Composer Document.
 * Stores meeting metadata that doesn't map to the Document type.
 */
export const GranolaSyncRecord = Schema.Struct({
  /** Granola note ID for sync. */
  granolaId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Reference to the synced Composer Document. */
  document: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
  /** Meeting attendees. */
  attendees: Schema.optional(Schema.Array(Attendee).pipe(FormInputAnnotation.set(false))),
  /** Calendar event metadata. */
  calendarEvent: Schema.optional(CalendarEvent.pipe(FormInputAnnotation.set(false))),
  /** Owner name from Granola. */
  ownerName: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Owner email from Granola. */
  ownerEmail: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Note creation timestamp from Granola. */
  createdAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Note last updated timestamp from Granola. */
  updatedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.granolaSyncRecord',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['granolaId']),
  Annotation.IconAnnotation.set({
    icon: 'ph--notebook--regular',
    hue: 'purple',
  }),
);

export interface GranolaSyncRecord extends Schema.Schema.Type<typeof GranolaSyncRecord> {}

/**
 * GranolaAccount schema for API credentials and sync state.
 */
export const GranolaAccount = Schema.Struct({
  /** Display name. */
  name: Schema.optional(Schema.String),
  /** Granola API key. */
  apiKey: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Polling interval in milliseconds. */
  pollIntervalMs: Schema.optional(Schema.Number),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.granolaAccount',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--notebook--regular',
    hue: 'purple',
  }),
);

export interface GranolaAccount extends Schema.Schema.Type<typeof GranolaAccount> {}

/** Input schema for creating a GranolaAccount. */
export const CreateGranolaAccountSchema = Schema.Struct({
  apiKey: Schema.String.annotations({
    title: 'API Key',
    description: 'Granola API key (from Settings > API in the Granola app).',
  }),
});

export interface CreateGranolaAccountSchema extends Schema.Schema.Type<typeof CreateGranolaAccountSchema> {}

/** Creates a GranolaAccount object. */
export const makeAccount = (props: CreateGranolaAccountSchema): GranolaAccount => {
  return Obj.make(GranolaAccount, {
    name: 'Granola Notes',
    apiKey: props.apiKey,
    pollIntervalMs: 60_000,
  });
};
