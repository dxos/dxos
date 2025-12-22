//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Event, Message, Organization, Person } from '@dxos/types';

import {
  CalendarArticle,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxSettings,
  MessageArticle,
  MessageCard,
  POPOVER_SAVE_FILTER,
  PopoverSaveFilter,
  RelatedToContact,
  RelatedToOrganization,
} from '../components';
import { meta } from '../meta';
import { Calendar, Mailbox } from '../types';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/mailbox`,
      role: ['article'],
      filter: (
        data,
      ): data is {
        attendableId?: string;
        subject: Mailbox.Mailbox;
        properties: { filter?: string };
      } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data }) => {
        return (
          <MailboxArticle subject={data.subject} filter={data.properties?.filter} attendableId={data.attendableId} />
        );
      },
    }),
    createSurface({
      id: `${meta.id}/message`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Message.Message; companionTo: Mailbox.Mailbox } =>
        Obj.instanceOf(Message.Message, data.subject) && Obj.instanceOf(Mailbox.Mailbox, data.companionTo),
      component: ({ data: { companionTo, subject }, role }) => {
        return <MessageArticle role={role} subject={subject} mailbox={companionTo} />;
      },
    }),
    createSurface({
      id: `${meta.id}/event`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Event.Event; companionTo: Calendar.Calendar } =>
        Obj.instanceOf(Event.Event, data.subject) && Obj.instanceOf(Calendar.Calendar, data.companionTo),
      component: ({ data: { companionTo, subject }, role }) => {
        return <EventArticle role={role} subject={subject} calendar={companionTo} />;
      },
    }),
    createSurface({
      id: `${meta.id}/calendar`,
      role: ['article'],
      filter: (data): data is { subject: Calendar.Calendar } => Obj.instanceOf(Calendar.Calendar, data.subject),
      component: ({ data }) => <CalendarArticle subject={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/message-card`,
      role: ['card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { subject: Message.Message } => Obj.instanceOf(Message.Message, data?.subject),
      component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/event-card`,
      role: ['card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { subject: Event.Event } => Obj.instanceOf(Event.Event, data?.subject),
      component: ({ data: { subject }, role }) => <EventCard subject={subject} role={role} />,
    }),
    createSurface({
      id: POPOVER_SAVE_FILTER,
      role: 'card--popover',
      filter: (data): data is { props: { mailbox: Mailbox.Mailbox; filter: string } } =>
        data.component === POPOVER_SAVE_FILTER &&
        data.props !== null &&
        typeof data.props === 'object' &&
        'mailbox' in data.props &&
        'filter' in data.props &&
        Obj.instanceOf(Mailbox.Mailbox, data.props.mailbox) &&
        typeof data.props.filter === 'string',
      component: ({ data }) => <PopoverSaveFilter mailbox={data.props.mailbox} filter={data.props.filter} />,
    }),
    createSurface({
      id: `${meta.id}/mailbox/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Mailbox.Mailbox } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data }) => <MailboxSettings subject={data.subject} />,
    }),

    // TODO(wittjosiah): Generalize the mess below.
    createSurface({
      id: `${meta.id}/contact-related`,
      role: 'related',
      filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
      component: ({ data: { subject } }) => <RelatedToContact subject={subject} />,
    }),
    createSurface({
      id: `${meta.id}/organization-related`,
      role: 'related',
      filter: (data): data is { subject: Organization.Organization } =>
        Obj.instanceOf(Organization.Organization, data.subject),
      component: ({ data: { subject } }) => <RelatedToOrganization subject={subject} />,
    }),
  ]));
