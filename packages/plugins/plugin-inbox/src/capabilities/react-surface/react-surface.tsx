//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { Event, Message, Organization, Person } from '@dxos/types';

import {
  CalendarArticle,
  ComposeEmailDialog,
  type ComposeEmailDialogProps,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxSettings,
  MessageArticle,
  MessageCard,
  PopoverSaveFilter,
  RelatedToContact,
  RelatedToOrganization,
} from '../../components';
import { COMPOSE_EMAIL_DIALOG, POPOVER_SAVE_FILTER } from '../../constants';
import { GmailFunctions } from '../../functions';
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
          <PopoverSaveFilter feed={data.props.feed} config={data.props.config} filter={data.props.filter} />
        ),
      }),
      Surface.create({
        id: COMPOSE_EMAIL_DIALOG,
        role: 'dialog',
        filter: (data): data is { component: string; props?: ComposeEmailDialogProps } =>
          data.component === COMPOSE_EMAIL_DIALOG,
        component: ({ data }) => {
          const { invokePromise } = useOperationInvoker();
          const space = useActiveSpace();
          const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
          const runtime = space?.id ? computeRuntime.getRuntime(space.id) : undefined;

          const handleSend = useCallback(
            async (message: Message.Message) => {
              if (!runtime) {
                throw new Error('Runtime not available');
              }
              await runtime.runPromise(invokeFunctionWithTracing(GmailFunctions.Send, { message }));
              log.info('email sent');
              await invokePromise(LayoutOperation.UpdateDialog, { state: false });
            },
            [runtime, invokePromise],
          );

          const handleCancel = useCallback(
            () => invokePromise(LayoutOperation.UpdateDialog, { state: false }),
            [invokePromise],
          );

          return <ComposeEmailDialog {...(data.props ?? {})} onSend={handleSend} onCancel={handleCancel} />;
        },
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
