//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-space';

import { CalendarType } from './calendar';
import { ContactsType } from './contacts';
import { MailboxType } from './mail';
import { INBOX_PLUGIN } from '../meta';

export namespace InboxAction {
  const INBOX_ACTION = `${INBOX_PLUGIN}/action`;

  export class CreateMailbox extends S.TaggedClass<CreateMailbox>()(`${INBOX_ACTION}/create-mailbox`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: MailboxType,
    }),
  }) {}

  export class CreateContacts extends S.TaggedClass<CreateContacts>()(`${INBOX_ACTION}/create-contacts`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: ContactsType,
    }),
  }) {}

  export class CreateCalendar extends S.TaggedClass<CreateCalendar>()(`${INBOX_ACTION}/create-calendar`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CalendarType,
    }),
  }) {}
}

export type InboxPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
