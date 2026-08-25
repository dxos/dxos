//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
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

import { POPOVER_SAVE_FILTER } from '../constants';
import { getSubscriptionsId } from '../paths';
import { isAttachmentRef } from './app-graph-builder';
import { EventArticleSurface, MessageArticleSurface } from './InboxSurfaces';

const isNonDraftMessage = (subject: unknown): subject is Message.Message =>
  Obj.instanceOf(Message.Message, subject) && !DraftMessage.instanceOf(subject);

/** A single non-draft message or a non-empty conversation (thread) of them. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'subscriptions',
        filter: Surface.makeFilter(AppSurface.Article, (data) => {
          // A filter runs against every article candidate, including ones whose data carries no
          // `attendableId` despite the type — throwing here fails the whole surface match.
          const lastSegment = data.attendableId?.split('/').pop();
          return lastSegment === getSubscriptionsId() && Mailbox.instanceOf(data.subject);
        }),
        component: SubscriptionsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
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
      Surface.create({
        id: 'draftMessage',
        filter: AppSurface.subject(AppSurface.Article, DraftMessage.instanceOf),
        component: EditMessageArticle,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'message',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, isNonDraftMessage),
          AppSurface.subject(AppSurface.Section, isNonDraftMessage),
        ),
        component: MessageArticleSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
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
        component: EventArticleSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'calendar',
        filter: AppSurface.object(AppSurface.Article, Calendar.Calendar),
        component: CalendarArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'messageCard',
        filter: AppSurface.object(AppSurface.CardContent, Message.Message),
        component: MessageCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'eventCard',
        filter: AppSurface.object(AppSurface.CardContent, Event.Event),
        component: EventCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: POPOVER_SAVE_FILTER,
        filter: AppSurface.component<{ mailbox: Mailbox.Mailbox; filter: string }>(
          AppSurface.Popover,
          POPOVER_SAVE_FILTER,
        ),
        component: SaveFilterPopover,
        props: ({ data: { props } }) => ({ mailbox: props.mailbox, filter: props.filter }),
      }),
      Surface.create({
        id: 'mailboxProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Mailbox.Mailbox),
        component: MailboxProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'calendarProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Calendar.Calendar),
        component: CalendarProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),

      // TODO(wittjosiah): Generalize the mess below.
      Surface.create({
        id: 'contactRelated',
        filter: AppSurface.object(AppSurface.Related, Person.Person),
        component: RelatedToContact,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'organizationRelated',
        filter: AppSurface.object(AppSurface.Related, Organization.Organization),
        component: RelatedToOrganization,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
