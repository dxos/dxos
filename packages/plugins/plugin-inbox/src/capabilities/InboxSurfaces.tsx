//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they resolve graph nodes
// via hooks to find the mailbox or calendar that scopes the subject.

import React from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { parentId } from '@dxos/graph/GraphNode';
import { useNode } from '@dxos/plugin-graph/hooks';
import { type Event, type Message } from '@dxos/types';

import { EventArticle, MessageArticle } from '#containers';
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
