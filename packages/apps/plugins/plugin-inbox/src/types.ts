//
// Copyright 2023 DXOS.org
//

import { AddressBook as AddressBookType, Calendar as CalendarType, Mailbox as MailboxType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { INBOX_PLUGIN } from './meta';

const INBOX_ACTION = `${INBOX_PLUGIN}/action`;
export enum InboxAction {
  CREATE_MAILBOX = `${INBOX_ACTION}/create-mailbox`,
  CREATE_ADDRESSBOOK = `${INBOX_ACTION}/create-addressbook`,
  CREATE_CALENDAR = `${INBOX_ACTION}/create-calendar`,
}

export type InboxPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isMailbox = (data: unknown): data is MailboxType => {
  return isTypedObject(data) && MailboxType.schema.typename === data.__typename;
};

export const isAddressBook = (data: unknown): data is AddressBookType => {
  return isTypedObject(data) && AddressBookType.schema.typename === data.__typename;
};

export const isCalendar = (data: unknown): data is CalendarType => {
  return isTypedObject(data) && CalendarType.schema.typename === data.__typename;
};
