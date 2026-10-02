//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { DraftMessage, Event, Message, Organization, Person } from '@dxos/types';

import {
  AttachmentArticle,
  CalendarArticle,
  CalendarProperties,
  EditMessageArticle,
  EventCard,
  MailboxArticle,
  MailboxProperties,
  MessageCard,
  RelatedToContact,
  RelatedToOrganization,
  SaveFilterPopover,
  SubscriptionsArticle,
} from '#containers';
import { Calendar, Mailbox } from '#types';

import { POPOVER_SAVE_FILTER } from '../constants.ts';
import { getSubscriptionsId } from '../paths.ts';
import { isAttachmentRef } from './app-graph-builder.ts';
import { EventArticleSurface, MessageArticleSurface } from './InboxSurfaces.tsx';

const isNonDraftMessage = (subject: unknown): subject is Message.Message =>
  Obj.instanceOf(Message.Message, subject) && !DraftMessage.instanceOf(subject);

/** A single non-draft message or a non-empty conversation (thread) of them. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'subscriptions',
        filter: Surface.Root.makeFilter(AppSurface.Article, (data) => {
          // A filter runs against every article candidate, including ones whose data carries no
          // `attendableId` despite the type — throwing here fails the whole surface match.
          const lastSegment = data.attendableId?.split('/').pop();
          return lastSegment === getSubscriptionsId() && Mailbox.instanceOf(data.subject);
        }),
        component: SubscriptionsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'mailbox',
        filter: AppSurface.object(AppSurface.Article, Mailbox.Mailbox),
        component: MailboxArticle,
        props: ({ data: { subject, attendableId, properties } }) => ({
          subject,
          filter: properties?.filter,
          systemTag: properties?.systemTag,
          attendableId,
        }),
      }),
      Surface.Root.create({
        id: 'draftMessage',
        filter: AppSurface.subject(AppSurface.Article, DraftMessage.instanceOf),
        component: EditMessageArticle,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'message',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, isNonDraftMessage),
          AppSurface.subject(AppSurface.Section, isNonDraftMessage),
        ),
        component: MessageArticleSurface,
        props: ({ role, data: { subject, attendableId, nodeId } }) => ({ role, subject, attendableId, nodeId }),
      }),
      Surface.Root.create({
        id: 'attachment',
        // Matched by the node's own type rather than the subject: the subject is the MESSAGE, which
        // the message surface also claims, so only the attachment node distinguishes the two.
        filter: AppSurface.subject(AppSurface.Article, isAttachmentRef),
        component: AttachmentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({
          role,
          subject: subject.message,
          attachmentIndex: subject.index,
          attendableId,
        }),
      }),
      Surface.Root.create({
        id: 'event',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Event.Event),
          AppSurface.object(AppSurface.Section, Event.Event),
        ),
        component: EventArticleSurface,
        props: ({ role, data: { subject, attendableId, nodeId } }) => ({ role, subject, attendableId, nodeId }),
      }),
      Surface.Root.create({
        id: 'calendar',
        filter: AppSurface.object(AppSurface.Article, Calendar.Calendar),
        component: CalendarArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'messageCard',
        filter: AppSurface.object(AppSurface.CardContent, Message.Message),
        component: MessageCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'eventCard',
        filter: AppSurface.object(AppSurface.CardContent, Event.Event),
        component: EventCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: POPOVER_SAVE_FILTER,
        filter: AppSurface.component<{ mailbox: Mailbox.Mailbox; filter: string }>(
          AppSurface.Popover,
          POPOVER_SAVE_FILTER,
        ),
        component: SaveFilterPopover,
        props: ({ data: { props } }) => ({ mailbox: props.mailbox, filter: props.filter }),
      }),
      Surface.Root.create({
        id: 'mailboxProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Mailbox.Mailbox),
        component: MailboxProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'calendarProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Calendar.Calendar),
        component: CalendarProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),

      // TODO(wittjosiah): Generalize the mess below.
      Surface.Root.create({
        id: 'contactRelated',
        filter: AppSurface.object(AppSurface.Related, Person.Person),
        component: RelatedToContact,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'organizationRelated',
        filter: AppSurface.object(AppSurface.Related, Organization.Organization),
        component: RelatedToOrganization,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
