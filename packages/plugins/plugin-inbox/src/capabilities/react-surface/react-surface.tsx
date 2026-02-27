//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { type Feed, Obj } from '@dxos/echo';
import { Event, Message, Organization, Person } from '@dxos/types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import {
  CalendarArticle,
  DraftMessageArticle,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxSettings,
  MessageArticle,
  MessageCard,
  RelatedToContact,
  RelatedToOrganization,
  SaveFilterPopover,
} from '../../containers';
import { meta } from '../../meta';
import { Calendar, Mailbox } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/mailbox`,
        role: ['article'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: Feed.Feed;
          properties: { filter?: string };
        } => Mailbox.instanceOf(data.subject),
        component: ({ data }) => {
          return (
            <MailboxArticle subject={data.subject} filter={data.properties?.filter} attendableId={data.attendableId} />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}/message`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Message.Message; companionTo: Feed.Feed } =>
          Obj.instanceOf(Message.Message, data.subject) && Mailbox.instanceOf(data.companionTo),
        component: ({ data: { companionTo, subject }, role }) => {
          return <MessageArticle role={role} subject={subject} feed={companionTo} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/draft-message`,
        role: ['article'],
        filter: (data): data is { subject: Message.Message } =>
          Obj.instanceOf(Message.Message, data.subject) && !Mailbox.instanceOf(data.companionTo),
        component: ({ data: { subject }, role }) => {
          return <DraftMessageArticle role={role} subject={subject} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/event`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Event.Event; companionTo: Feed.Feed } =>
          Obj.instanceOf(Event.Event, data.subject) && Calendar.instanceOf(data.companionTo),
        component: ({ data: { companionTo, subject }, role }) => {
          return <EventArticle role={role} subject={subject} feed={companionTo} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/calendar`,
        role: ['article'],
        filter: (data): data is { subject: Feed.Feed } => Calendar.instanceOf(data.subject),
        component: ({ data, role }) => <CalendarArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/message-card`,
        role: 'card--content',
        filter: (data): data is { subject: Message.Message } => Obj.instanceOf(Message.Message, data?.subject),
        component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}/event-card`,
        role: 'card--content',
        filter: (data): data is { subject: Event.Event } => Obj.instanceOf(Event.Event, data?.subject),
        component: ({ data: { subject }, role }) => <EventCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: POPOVER_SAVE_FILTER,
        role: 'popover',
        filter: (data): data is { props: { feed: Feed.Feed; config?: Mailbox.Config; filter: string } } =>
          data.component === POPOVER_SAVE_FILTER &&
          data.props !== null &&
          typeof data.props === 'object' &&
          'feed' in data.props &&
          'filter' in data.props &&
          Mailbox.instanceOf(data.props.feed) &&
          typeof data.props.filter === 'string',
        component: ({ data }) => (
          <SaveFilterPopover feed={data.props.feed} config={data.props.config} filter={data.props.filter} />
        ),
      }),
      Surface.create({
        id: `${meta.id}/mailbox/companion/settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Feed.Feed } => Mailbox.instanceOf(data.subject),
        component: ({ data }) => <MailboxSettings subject={data.subject} />,
      }),

      // TODO(card-cleanup): Remove.
      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: `${meta.id}/contact-related`,
        role: 'related',
        filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
        component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
      }),
      Surface.create({
        id: `${meta.id}/organization-related`,
        role: 'related',
        filter: (data): data is { subject: Organization.Organization } =>
          Obj.instanceOf(Organization.Organization, data.subject),
        component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
      }),
    ]),
  ),
);
