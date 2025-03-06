//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { CalendarType, ContactsType, InboxAction, MailboxType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: InboxAction.CreateMailbox,
      resolve: () => ({
        data: { object: create(MailboxType, { messages: [] }) },
      }),
    }),
    createResolver({
      intent: InboxAction.CreateContacts,
      resolve: () => ({
        data: { object: create(ContactsType, {}) },
      }),
    }),
    createResolver({
      intent: InboxAction.CreateCalendar,
      resolve: () => ({
        data: { object: create(CalendarType, {}) },
      }),
    }),
  ]);
