//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Blob, Feed, Tag, View } from '@dxos/echo';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { Table } from '@dxos/react-ui-table/types';
import { TagIndex } from '@dxos/schema';
import { Event, Message, Organization, Person } from '@dxos/types';

import { type Provides as TeamProvides } from '../team/index.ts';
import { type EventKey, makeCalendar } from './calendar.ts';
import { type ContactKey, makeContacts } from './contacts.ts';
import { type ThreadKey, makeMail } from './mail.ts';
import { type OrgKey, makeOrganizations } from './organizations.ts';
import { makeViews } from './views.ts';

export type Requires = { readonly team: TeamProvides };

export type Provides = {
  readonly orgs: Record<OrgKey, Organization.Organization>;
  readonly people: Record<ContactKey, Person.Person>;
  readonly mailbox: Mailbox.Mailbox;
  readonly calendar: Calendar.Calendar;
  /** Named threads from the spec, messages oldest first; `weeklyUpdate` holds all 8 issues. */
  readonly threads: Record<ThreadKey, Message.Message[]>;
  /** Events by key, sorted by start; `oneOnOne` and `interviews` hold every occurrence. */
  readonly events: Record<EventKey, Event.Event[]>;
};

/** Astrid's inbox, contacts and calendar. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides, Requires> = SampleSpace.partial('fieldstoneInboxCrm', {
  schemas: [
    Blob.Blob,
    Calendar.Calendar,
    Event.Event,
    Feed.Feed,
    Kanban.Kanban,
    Mailbox.Mailbox,
    Message.Message,
    Organization.Organization,
    Person.Person,
    Table.Table,
    Tag.Tag,
    TagIndex.TagIndex,
    View.View,
  ],
  run: ({ team }) =>
    Effect.gen(function* () {
      const orgs = yield* makeOrganizations();
      const people = yield* makeContacts(orgs);
      const directory = { ...team.people, ...people };
      yield* makeViews(Object.values(directory));
      const { mailbox, threads } = yield* makeMail(directory, team.agents);
      const { calendar, events } = yield* makeCalendar(directory);
      return { orgs, people, mailbox, calendar, threads, events };
    }),
});
