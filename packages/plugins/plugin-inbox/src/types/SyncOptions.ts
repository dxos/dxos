//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Common options for syncing data from external providers (e.g. Gmail,
 * Google Calendar). Stored on `IntegrationTarget.options` and interpreted
 * by the contributing `IntegrationProvider`'s sync operation; applied in
 * addition to provider-specific defaults (e.g. Gmail label, Calendar id).
 */
export const SyncOptions = Schema.Struct({
  /** Sync messages or events from this many days back. */
  syncBackDays: Schema.optional(
    Schema.Number.annotations({
      title: 'Sync back days',
      description: 'Sync messages or events from this many days back.',
    }),
  ),
  /**
   * Optional provider-specific search query, applied in addition to the date
   * range and standard properties. For Gmail: a search expression
   * (e.g. `label:important OR label:investor`). For Google Calendar:
   * a free-text search across event fields.
   */
  filter: Schema.optional(
    Schema.String.annotations({
      title: 'Filter',
      description: 'Optional provider-specific search query applied in addition to the date range.',
    }),
  ),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Sync options for sources that have a forward time horizon (e.g. calendars).
 */
export const CalendarSyncOptions = Schema.Struct({
  /** Sync events forward from today by this many days. */
  syncForwardDays: Schema.optional(
    Schema.Number.annotations({
      title: 'Sync forward days',
      description: 'Sync events forward from today by this many days.',
    }),
  ),
  ...SyncOptions.fields,
});

export interface CalendarSyncOptions extends Schema.Schema.Type<typeof CalendarSyncOptions> {}
