//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Event, Message, Organization, Person } from '@dxos/types';

import { MAILBOX_DRAFTS_NODE_DATA, POPOVER_SAVE_FILTER } from '../constants';
import { getDraftsId } from '../paths';
import {
  CalendarArticle,
  CalendarSettings,
  DraftMessageArticle,
  DraftsArticle,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxSettings,
  MessageArticle,
  MessageCard,
  RelatedToContact,
  RelatedToOrganization,
  SaveFilterPopover,
} from '#containers';
import { meta } from '#meta';
import { Calendar, DraftMessage, Mailbox } from '#types';
import { getParentId, useNode } from '@dxos/plugin-graph';
import { useAppGraph } from '@dxos/app-toolkit/ui';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.drafts`,
        role: ['article'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: typeof MAILBOX_DRAFTS_NODE_DATA;
          properties: { mailbox: Mailbox.Mailbox };
        } => {
          const mailbox = (data.properties as { mailbox?: Mailbox.Mailbox } | undefined)?.mailbox;
          const attendableId = data.attendableId as string | undefined;
          const lastSegment = typeof attendableId === 'string' ? attendableId.split('/').pop() : undefined;
          return (
            lastSegment === getDraftsId() &&
            Mailbox.instanceOf(mailbox) &&
            data.subject === MAILBOX_DRAFTS_NODE_DATA
          );
        },
        component: ({ data, role }) => {
          const mailbox = (data.properties as { mailbox: Mailbox.Mailbox }).mailbox;
          const space = useActiveSpace();
          return (
            <DraftsArticle role={role} space={space} attendableId={data.attendableId} mailbox={mailbox} />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}.mailbox`,
        role: ['article'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: Mailbox.Mailbox;
          properties: { filter?: string };
        } => Mailbox.instanceOf(data.subject),
        component: ({ data }) => {
          return (
            <MailboxArticle subject={data.subject} filter={data.properties?.filter} attendableId={data.attendableId} />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}.draft-message`,
        role: ['article'],
        filter: (data): data is { subject: Message.Message } => DraftMessage.instanceOf(data.subject),
        component: ({ data: { subject }, role }) => {
          return <DraftMessageArticle role={role} subject={subject} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.message`,
        role: ['article', 'section'],
        filter: (
          data,
        ): data is {
          attendableId: string;
          subject: Message.Message;
          companionTo?: Mailbox.Mailbox;
        } =>
          typeof data.attendableId === 'string' &&
          Obj.instanceOf(Message.Message, data.subject) &&
          !DraftMessage.instanceOf(data.subject),
        component: ({ data: { attendableId, subject, companionTo }, role }) => {
          const { graph } = useAppGraph();
          const parentId = getParentId(attendableId);
          const parent = useNode(graph, parentId);
          const mailbox = parent?.properties.mailbox;
          return (
            <MessageArticle
              role={role}
              subject={subject}
              attendableId={attendableId}
              companionTo={companionTo}
              mailbox={companionTo ? undefined : mailbox}
            />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}.event`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Event.Event; companionTo: Calendar.Calendar } =>
          Obj.instanceOf(Event.Event, data.subject) && Calendar.instanceOf(data.companionTo),
        component: ({ data, role }) => {
          if (!data?.subject || !data?.companionTo) return null;
          return <EventArticle role={role} subject={data.subject} calendar={data.companionTo} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.calendar`,
        role: ['article'],
        filter: (data): data is { subject: Calendar.Calendar; attendableId?: string } =>
          Calendar.instanceOf(data.subject),
        component: ({ data, role }) => (
          <CalendarArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.message-card`,
        role: 'card--content',
        filter: (data): data is { subject: Message.Message } => Obj.instanceOf(Message.Message, data?.subject),
        component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}.event-card`,
        role: 'card--content',
        filter: (data): data is { subject: Event.Event } => Obj.instanceOf(Event.Event, data?.subject),
        component: ({ data: { subject }, role }) => <EventCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: POPOVER_SAVE_FILTER,
        role: 'popover',
        filter: (data): data is { props: { mailbox: Mailbox.Mailbox; filter: string } } =>
          data.component === POPOVER_SAVE_FILTER &&
          data.props !== null &&
          typeof data.props === 'object' &&
          'mailbox' in data.props &&
          'filter' in data.props &&
          Mailbox.instanceOf(data.props.mailbox) &&
          typeof data.props.filter === 'string',
        component: ({ data }) => <SaveFilterPopover mailbox={data.props.mailbox} filter={data.props.filter} />,
      }),
      Surface.create({
        id: `${meta.id}.mailbox.companion.settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Mailbox.Mailbox } => Mailbox.instanceOf(data.subject),
        component: ({ data }) => <MailboxSettings subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}.calendar.companion.settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Calendar.Calendar } => Calendar.instanceOf(data.subject),
        component: ({ data }) => <CalendarSettings subject={data.subject} />,
      }),

      // TODO(card-cleanup): Remove.
      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: `${meta.id}.contact-related`,
        role: 'related',
        filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
        component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
      }),
      Surface.create({
        id: `${meta.id}.organization-related`,
        role: 'related',
        filter: (data): data is { subject: Organization.Organization } =>
          Obj.instanceOf(Organization.Organization, data.subject),
        component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
      }),
    ]),
  ),
);
