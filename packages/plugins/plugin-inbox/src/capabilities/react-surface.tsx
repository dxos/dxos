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
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';

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
            lastSegment === getDraftsId() && Mailbox.instanceOf(mailbox) && data.subject === MAILBOX_DRAFTS_NODE_DATA
          );
        },
        component: ({ data, role }) => {
          const mailbox = (data.properties as { mailbox: Mailbox.Mailbox }).mailbox;
          const space = useActiveSpace();
          return <DraftsArticle role={role} space={space} attendableId={data.attendableId} mailbox={mailbox} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.mailbox`,
        role: ['article'],
        filter: AppSurface.object(Mailbox.Mailbox, { attendable: true }),
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
        filter: AppSurface.and(AppSurface.object(Event.Event), AppSurface.companion(Calendar.Calendar)),
        component: ({ data, role }) => {
          if (!data?.subject || !data?.companionTo) return null;
          return <EventArticle role={role} subject={data.subject} companionTo={data.companionTo} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.calendar`,
        role: ['article'],
        filter: AppSurface.object(Calendar.Calendar, { attendable: true }),
        component: ({ data, role }) => (
          <CalendarArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.message-card`,
        role: 'card--content',
        filter: AppSurface.object(Message.Message),
        component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}.event-card`,
        role: 'card--content',
        filter: AppSurface.object(Event.Event),
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
        filter: AppSurface.object(Mailbox.Mailbox),
        component: ({ data }) => <MailboxSettings subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}.calendar.companion.settings`,
        role: 'object-settings',
        filter: AppSurface.object(Calendar.Calendar),
        component: ({ data }) => <CalendarSettings subject={data.subject} />,
      }),

      // TODO(card-cleanup): Remove.
      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: `${meta.id}.contact-related`,
        role: 'related',
        filter: AppSurface.object(Person.Person),
        component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
      }),
      Surface.create({
        id: `${meta.id}.organization-related`,
        role: 'related',
        filter: AppSurface.object(Organization.Organization),
        component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
      }),
    ]),
  ),
);
