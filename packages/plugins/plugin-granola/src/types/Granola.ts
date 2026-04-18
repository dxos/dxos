//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Markdown } from '@dxos/plugin-markdown/types';
import { AccessToken } from '@dxos/types';

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
 * Lightweight sync record that links a Granola note to a Composer Document.
 *
 * External identity tracked via `Obj.Meta` foreignKeys
 * (`{ source: 'granola.ai', id: <granolaId> }`).
 */
export const GranolaSyncRecord = Schema.Struct({
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
    version: '0.2.0',
  }),
  LabelAnnotation.set(['ownerName']),
  Annotation.IconAnnotation.set({
    icon: 'ph--notebook--regular',
    hue: 'purple',
  }),
);

export interface GranolaSyncRecord extends Schema.Schema.Type<typeof GranolaSyncRecord> {}

/**
 * GranolaAccount for sync configuration.
 * Credentials stored as an `AccessToken` reference, not inline.
 */
export const GranolaAccount = Schema.Struct({
  /** Display name. */
  name: Schema.optional(Schema.String),
  /** Granola API credentials. */
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Granola credentials',
      description: 'API key for syncing meeting notes.',
    }),
  ),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Polling interval in milliseconds. */
  pollIntervalMs: Schema.optional(Schema.Number),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.granolaAccount',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--notebook--regular',
    hue: 'purple',
  }),
);

export interface GranolaAccount extends Schema.Schema.Type<typeof GranolaAccount> {}

/** Input schema for creating a GranolaAccount via the Create menu. */
export const CreateGranolaAccountSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Display name for this Granola account.',
    }),
  ),
});

export interface CreateGranolaAccountSchema extends Schema.Schema.Type<typeof CreateGranolaAccountSchema> {}

/** Creates a GranolaAccount object. */
export const makeAccount = (props?: { name?: string }): GranolaAccount => {
  return Obj.make(GranolaAccount, {
    name: props?.name ?? 'Granola Notes',
    pollIntervalMs: 60_000,
  });
};

/** Creates a GranolaSyncRecord with foreignKey for the Granola note ID. */
export const makeSyncRecord = (props: {
  granolaId: string;
  document: Ref.Ref<Markdown.Document>;
  attendees?: Attendee[];
  calendarEvent?: CalendarEvent;
  ownerName?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}): GranolaSyncRecord => {
  const { granolaId, ...rest } = props;
  return Obj.make(GranolaSyncRecord, {
    [Obj.Meta]: {
      keys: [{ id: granolaId, source: 'granola.ai' }],
    },
    ...rest,
  });
};

// ── Foreign key helpers ─────────────────────────────────────────────────────

const GRANOLA_SOURCE = 'granola.ai';

/** Extract the Granola ID from an object's foreignKeys. */
export const getGranolaId = (obj: Obj.Any): string | undefined => {
  const meta = Obj.getMeta(obj);
  return meta.keys?.find((key: { source: string; id: string }) => key.source === GRANOLA_SOURCE)?.id;
};
