//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they resolve graph nodes
// via hooks to find the mailbox or calendar that scopes the subject.

import React from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Scope } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { parentId } from '@dxos/graph/GraphNode';
import { useNode } from '@dxos/plugin-graph/hooks';
import { Banner, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { type Event, Message } from '@dxos/types';

import { EventArticle, MessageArticle } from '#containers';
import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

export type MessageArticleSurfaceProps = {
  role: string;
  subject: Message.Message;
  attendableId: string;
};

/** Resolves the mailbox that scopes a message's conversation from the graph. */
export const MessageArticleSurface = ({ role, subject, attendableId }: MessageArticleSurfaceProps) => {
  const { graph } = useAppGraph();
  const parent = useNode(graph, parentId(attendableId));
  // A message lives under its mailbox view; every mailbox view carries the mailbox as its node
  // `data`, so use that (not `properties.mailbox`, which only some views set) to scope the
  // conversation lookup in MessageArticle.
  const mailbox = Mailbox.instanceOf(parent?.data) ? parent.data : undefined;

  return <MessageArticle role={role} subject={subject} attendableId={attendableId} mailbox={mailbox} />;
};

export type EventArticleSurfaceProps = {
  role: string;
  subject: Event.Event;
  attendableId: string;
};

/** Resolves the calendar an event belongs to; renders nothing when none is found. */
export const EventArticleSurface = ({ role, subject, attendableId }: EventArticleSurfaceProps) => {
  const { graph } = useAppGraph();
  // In companion mode attendableId is the calendar node itself; in primary mode
  // (navigated directly) attendableId is the event node and its parent is the calendar.
  const atNode = useNode(graph, attendableId);
  const parentNode = useNode(graph, parentId(attendableId));
  const calendar = Calendar.instanceOf(atNode?.data)
    ? atNode.data
    : Calendar.instanceOf(parentNode?.data)
      ? parentNode.data
      : undefined;
  if (!calendar) {
    return null;
  }

  return <EventArticle role={role} subject={subject} attendableId={attendableId} companionTo={calendar} />;
};

export type MailboxMessageCompanionProps = {
  role: string;
  /** The mailbox plank this companion is anchored to — the context its selection lives in. */
  attendableId: string;
  mailbox: Mailbox.Mailbox;
};

/**
 * The selected message, beside the mailbox rather than in place of it.
 *
 * One fixed slot, so it reads which message to show from the list's own selection rather than
 * carrying a subject of its own, and renders it through the same `MessageArticle` the deck mounts
 * when a message is opened as a plank on a narrow screen.
 */
export const MailboxMessageCompanion = ({ role, attendableId, mailbox }: MailboxMessageCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(mailbox);
  const feed = useResolveRef(mailbox.feed);
  const messages = useQuery(
    db,
    feed
      ? Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
      : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const selected = useSelection(attendableId, 'single');
  const message = messages.find(({ id }) => id === selected);
  if (!message) {
    return <Banner.Empty label={t('no-message-selected.message')} />;
  }

  return <MessageArticle role={role} subject={message} attendableId={`${attendableId}/message`} mailbox={mailbox} />;
};
