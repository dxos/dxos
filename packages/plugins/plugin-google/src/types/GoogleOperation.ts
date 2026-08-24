//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN, Ref, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as MailSend from '@dxos/plugin-inbox/MailSend';
// Referenced in the emitted .d.ts of the operations below; importing it lets TypeScript name it.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Event, type Message } from '@dxos/types';

/**
 * This provider's operations.
 *
 * Defined here rather than in plugin-inbox so a deployment without this connector never sees them:
 * plugin-inbox owns the mail domain, each provider owns its own wire protocol.
 */

export const GetGoogleCalendars = Operation.make({
  // TODO(wittjosiah): Declaring services here forces DynamicRuntime validation to fail before the handler
  //   runs because composer's invoker doesn't carry per-space Database. The handler provides
  //   `Database.layer(db)` itself (same pattern as plugin-trello GetTrelloBoards).
  meta: {
    key: DXN.make('org.dxos.operation.google.getCalendars'),
    name: 'Get Google Calendars',
    description: 'Discover Google Calendars reachable from a connection without materializing local Calendars.',
    icon: 'ph--calendar--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

export const GmailSend = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.sendMail'),
    name: 'Send Gmail',
    description: 'Send emails via Gmail.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  input: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    ...MailSend.Input.fields,
  }),
  output: MailSend.Output,
  services: [Credential.CredentialsService],
}).pipe(Operation.visible);

export const GoogleMailSync = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.syncMail'),
    name: 'Sync Google Mail',
    description: 'Sync emails from Gmail to the mailbox feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    ...ConnectorSpec.SyncInput.fields,
    userId: Schema.String.pipe(Schema.optional),
    label: Schema.String.pipe(
      Schema.annotate({
        description: 'Gmail label to sync emails from. Defaults to inbox.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  services: [Capability.Service, Database.Service, Credential.CredentialsService, Trace.TraceService],
}).pipe(Operation.visible, Operation.idempotent);

export const MaterializeGmailTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.materializeGmailTarget'),
    name: 'Materialize Gmail Target',
    description: 'Create the local Mailbox bound to a Gmail connection.',
    icon: 'ph--envelope--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

export const GoogleCalendarSync = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.syncCalendar'),
    name: 'Sync Google Calendar',
    description:
      'Sync events from Google Calendar. The initial sync uses startTime ordering for specified number of days. Subsequent syncs use updatedMin to catch all changes.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    ...ConnectorSpec.SyncInput.fields,
    googleCalendarId: Schema.optional(Schema.String),
    syncBackDays: Schema.optional(Schema.Number),
    syncForwardDays: Schema.optional(Schema.Number),
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    newEvents: Schema.Number,
  }),
  services: [Database.Service, Credential.CredentialsService],
}).pipe(Operation.visible);

export const MaterializeGoogleCalendarTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.materializeCalendarTarget'),
    name: 'Materialize Calendar Target',
    description: 'Create the local Calendar bound to a selected Google calendar.',
    icon: 'ph--calendar--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

export const CreateGoogleCalendarEvent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.createCalendarEvent'),
    name: 'Create Google Calendar Event',
    description: 'Create an event on Google Calendar.',
    icon: 'ph--calendar-plus--regular',
  },
  input: Schema.Struct({
    event: Type.getSchema(Event.Event),
    googleCalendarId: Schema.String.annotate({ description: 'Remote Google calendar id.' }),
    connection: Ref.Ref(Connection.Connection).annotate({
      description: 'Connection to source Google Calendar credentials from.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'Remote Google event id.' }),
  }),
  services: [Credential.CredentialsService],
}).pipe(Operation.visible);

export const GetGoogleContactGroups = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.getContactGroups'),
    name: 'Get Google Contact Groups',
    description: 'Discover Google Contact Groups reachable from a connection.',
    icon: 'ph--users--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

export const GoogleContactsSync = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.google.syncContacts'),
    name: 'Sync Google Contacts',
    description: 'Sync contacts from a Google Contact group into Person objects in the space.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    ...ConnectorSpec.SyncInput.fields,
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    upserted: Schema.Number,
  }),
  services: [Database.Service, Credential.CredentialsService],
}).pipe(Operation.visible);
