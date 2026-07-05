//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getParentId, useNode } from '@dxos/plugin-graph';
import { Event, Message, Organization, Person } from '@dxos/types';

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
import { Calendar, DraftMessage, Mailbox } from '#types';

import { MAILBOX_DRAFTS_NODE_DATA, POPOVER_SAVE_FILTER } from '../constants';
import { getDraftsId } from '../paths';

const isNonDraftMessage = (subject: unknown): subject is Message.Message =>
  Obj.instanceOf(Message.Message, subject) && !DraftMessage.instanceOf(subject);

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'drafts',
        filter: Surface.makeFilter(AppSurface.Article, (data) => {
          const mailbox = data.properties?.mailbox;
          const lastSegment = data.attendableId.split('/').pop();
          return (
            lastSegment === getDraftsId() && Mailbox.instanceOf(mailbox) && data.subject === MAILBOX_DRAFTS_NODE_DATA
          );
        }),
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
        id: 'draftMessage',
        filter: AppSurface.subject(AppSurface.Article, DraftMessage.instanceOf),
        component: ({ data: { subject }, role }) => {
          return <EditMessageArticle role={role} subject={subject} />;
        },
      }),
      Surface.create({
        id: 'message',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, isNonDraftMessage),
          AppSurface.subject(AppSurface.Section, isNonDraftMessage),
        ),
        component: ({ data, role }) => {
          const { graph } = useAppGraph();
          const parentId = getParentId(data.attendableId);
          const parent = useNode(graph, parentId);
          const mailbox = parent?.properties.mailbox;
          // companionTo is only present on Article data; Section renders without a companion.
          const companionTo = (data as { companionTo?: Mailbox.Mailbox }).companionTo;
          return (
            <MessageArticle
              role={role}
              subject={data.subject}
              attendableId={data.attendableId}
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
          // Primary mode (navigated directly — no companion; calendar looked up from parent node).
          AppSurface.object(AppSurface.Article, Event.Event),
          AppSurface.object(AppSurface.Section, Event.Event),
        ),
        component: ({ data, role }) => {
          const { graph } = useAppGraph();
          // In companion mode attendableId is the calendar node itself; in primary mode
          // (navigated directly) attendableId is the event node and its parent is the calendar.
          const atNode = useNode(graph, data.attendableId);
          const parentNode = useNode(graph, getParentId(data.attendableId));
          const calendar = Calendar.instanceOf(atNode?.data)
            ? atNode.data
            : Calendar.instanceOf(parentNode?.data)
              ? parentNode.data
              : undefined;
          if (!calendar) {
            return null;
          }
          return (
            <EventArticle role={role} subject={data.subject} attendableId={data.attendableId} companionTo={calendar} />
          );
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
        id: 'messageCard',
        filter: AppSurface.object(AppSurface.CardContent, Message.Message),
        component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: 'eventCard',
        filter: AppSurface.object(AppSurface.CardContent, Event.Event),
        component: ({ data: { subject }, role }) => <EventCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: POPOVER_SAVE_FILTER,
        filter: AppSurface.component<{ mailbox: Mailbox.Mailbox; filter: string }>(
          AppSurface.Popover,
          POPOVER_SAVE_FILTER,
        ),
        component: ({ data }) => <SaveFilterPopover mailbox={data.props.mailbox} filter={data.props.filter} />,
      }),
      Surface.create({
        id: 'mailboxProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Mailbox.Mailbox),
        component: ({ data }) => <MailboxProperties subject={data.subject} />,
      }),
      Surface.create({
        id: 'calendarProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Calendar.Calendar),
        component: ({ data }) => <CalendarProperties subject={data.subject} />,
      }),

      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: 'contactRelated',
        filter: AppSurface.object(AppSurface.Related, Person.Person),
        component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
      }),
      Surface.create({
        id: 'organizationRelated',
        filter: AppSurface.object(AppSurface.Related, Organization.Organization),
        component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
      }),
    ]),
  ),
);
