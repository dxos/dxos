//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getParentId, useNode } from '@dxos/plugin-graph';
import { Event, Message, Organization, Person } from '@dxos/types';

import { InboxSettings } from '#components';
import {
  CalendarArticle,
  CalendarProperties,
  DraftsArticle,
  EditMessageArticle,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxProperties,
  MessageArticle,
  MessageCard,
  RelatedToContact,
  RelatedToOrganization,
  SaveFilterPopover,
} from '#containers';
import { meta } from '#meta';
import { Calendar, DraftMessage, Mailbox, type Settings } from '#types';

import { MAILBOX_DRAFTS_NODE_DATA, POPOVER_SAVE_FILTER } from '../constants';
import { getDraftsId } from '../paths';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <InboxSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'drafts',
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
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          const mailbox = (data.properties as { mailbox: Mailbox.Mailbox }).mailbox;
          return <DraftsArticle role={role} space={space} attendableId={data.attendableId} mailbox={mailbox} />;
        },
      }),
      Surface.create({
        id: 'mailbox',
        filter: AppSurface.object(AppSurface.Article, Mailbox.Mailbox),
        component: ({ data }) => {
          return (
            <MailboxArticle subject={data.subject} filter={data.properties?.filter} attendableId={data.attendableId} />
          );
        },
      }),
      Surface.create({
        id: 'draft-message',
        role: ['article'],
        filter: (data): data is { subject: Message.Message } => DraftMessage.instanceOf(data.subject),
        component: ({ data: { subject }, role }) => {
          return <EditMessageArticle role={role} subject={subject} />;
        },
      }),
      Surface.create({
        id: 'message',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
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
        id: 'event',
        filter: AppSurface.oneOf(
          AppSurface.allOf(
            AppSurface.object(AppSurface.Article, Event.Event),
            AppSurface.companion(AppSurface.Article, Calendar.Calendar),
          ),
          AppSurface.allOf(
            AppSurface.object(AppSurface.Section, Event.Event),
            AppSurface.companion(AppSurface.Section, Calendar.Calendar),
          ),
        ),
        component: ({ data, role }) => {
          if (!data?.subject || !data?.companionTo) {
            return null;
          }
          return <EventArticle role={role} subject={data.subject} companionTo={data.companionTo} />;
        },
      }),
      Surface.create({
        id: 'calendar',
        filter: AppSurface.object(AppSurface.Article, Calendar.Calendar),
        component: ({ data, role }) => (
          <CalendarArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'message-card',
        filter: AppSurface.object(AppSurface.Card, Message.Message),
        component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: 'event-card',
        filter: AppSurface.object(AppSurface.Card, Event.Event),
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
        id: 'mailbox-properties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Mailbox.Mailbox),
        component: ({ data }) => <MailboxProperties subject={data.subject} />,
      }),
      Surface.create({
        id: 'calendar-properties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Calendar.Calendar),
        component: ({ data }) => <CalendarProperties subject={data.subject} />,
      }),

      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: 'contact-related',
        filter: AppSurface.object(AppSurface.Related, Person.Person),
        component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
      }),
      Surface.create({
        id: 'organization-related',
        filter: AppSurface.object(AppSurface.Related, Organization.Organization),
        component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
      }),
    ]),
  ),
);
