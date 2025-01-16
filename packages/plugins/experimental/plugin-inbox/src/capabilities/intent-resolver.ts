//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { CalendarType, ContactsType, InboxAction, MailboxType } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver(InboxAction.CreateMailbox, () => ({
      data: { object: create(MailboxType, { messages: [] }) },
    })),
    createResolver(InboxAction.CreateContacts, () => ({
      data: { object: create(ContactsType, {}) },
    })),
    createResolver(InboxAction.CreateCalendar, () => ({
      data: { object: create(CalendarType, {}) },
    })),
  ]);
