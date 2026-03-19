//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Feed, Ref } from '@dxos/echo';
import { CredentialsService, QueueService } from '@dxos/functions';
import { Message } from '@dxos/types';

import * as Calendar from '../types/Calendar';
import * as Mailbox from '../types/Mailbox';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.email-create',
    name: 'Create email draft',
    description: 'Creates a new email draft.',
  },
  input: Schema.Struct({
    subject: Schema.String.annotations({
      description: 'The subject of the email.',
    }),
    to: Schema.String.annotations({
      description: 'The recipient email address.',
    }),
    body: Schema.String.annotations({
      description: 'The body of the email.',
    }),
    replyTo: Schema.optional(Ref.Ref(Message.Message)).annotations({
      description: 'The message to reply to.',
    }),
  }),
  output: Schema.Struct({
    newMessageDXN: Schema.String,
  }),
  services: [Database.Service],
});

export const Open = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.email-open',
    name: 'Open email',
    description: 'Opens and reads the contents of a mailbox.',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service, Feed.Service],
});

export const Summarize = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.email-summarize',
    name: 'Summarize',
    description: 'Summarize a mailbox.',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the mailbox.',
    }),
  }),
  services: [Database.Service, Feed.Service, AiService.AiService, QueueService],
});

export const Classify = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.email-classify',
    name: 'Classify',
    description:
      'Classifies an email message by selecting and applying an appropriate tag from available tags in the database.',
  },
  input: Schema.Struct({
    message: Schema.Any.annotations({
      description: 'The message object to classify.',
    }),
  }),
  output: Schema.Union(
    Schema.Struct({
      tagId: Schema.String.annotations({
        description: 'The ID of the selected tag.',
      }),
      tagLabel: Schema.String.annotations({
        description: 'The label of the selected tag.',
      }),
    }),
    Schema.Void,
  ),
  services: [AiService.AiService, Database.Service, QueueService],
});

export const GmailSend = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.google-mail-send',
    name: 'Send Gmail',
    description: 'Send emails via Gmail.',
  },
  input: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    message: Message.Message,
    mailbox: Ref.Ref(Mailbox.Mailbox).pipe(
      Schema.annotations({ description: 'Optional mailbox to send from. Uses mailbox credentials if provided.' }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    id: Schema.String,
    threadId: Schema.String,
  }),
  services: [CredentialsService],
});

export const GmailSync = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.google-mail-sync',
    name: 'Sync Gmail',
    description: 'Sync emails from Gmail to the mailbox feed.',
  },
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({ description: 'Reference to the mailbox object.' }),
    userId: Schema.String.pipe(Schema.optional),
    label: Schema.String.pipe(
      Schema.annotations({
        description: 'Gmail label to sync emails from. Defaults to inbox.',
      }),
      Schema.optional,
    ),
    after: Schema.Union(Schema.Number, Schema.String).pipe(
      Schema.annotations({
        description: 'Date to start syncing from, either a unix timestamp or yyyy-MM-dd string.',
      }),
      Schema.optional,
    ),
    restrictedMode: Schema.Boolean.pipe(
      Schema.annotations({
        description: 'Use restricted mode to limit to single date range and max 20 messages. Reduces subrequests.',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  services: [Database.Service, Feed.Service, CredentialsService],
});

export const CalendarSync = Operation.make({
  meta: {
    key: 'org.dxos.function.inbox.google-calendar-sync',
    name: 'Sync Google Calendar',
    description:
      'Sync events from Google Calendar. The initial sync uses startTime ordering for specified number of days. Subsequent syncs use updatedMin to catch all changes.',
  },
  input: Schema.Struct({
    calendar: Ref.Ref(Calendar.Calendar).annotations({
      description: 'Reference to the calendar object.',
    }),
    googleCalendarId: Schema.optional(Schema.String),
    syncBackDays: Schema.optional(Schema.Number),
    syncForwardDays: Schema.optional(Schema.Number),
    pageSize: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    newEvents: Schema.Number,
  }),
  services: [Database.Service, Feed.Service, CredentialsService],
});
