//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { useQueue } from '@dxos/react-client/echo';
import { type MessageType } from '@dxos/schema';

import { type ActionType, MessageList } from './MessageList';
import { type MailboxType, MessageState } from '../../types';

const DEFAULT_READ_TIMEOUT = 3_000;

const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

const setMessageProperty = (message: MessageType, property: string, value: any) => {
  if (!message.properties) {
    message.properties = {};
  }

  message.properties[property] = value;
};

export type MailboxOptions = { readTimout?: number };

// TODO(burdon): Extract contacts/orgs.
// TODO(burdon): Split message body into parts and allow trim (e.g., remove forwarded part). Message as light stack?
// TODO(burdon): Highlight message/chunks for action (e.g., follow-up, triggers embedding).
// TODO(burdon): Create outline/kanban.
// TODO(burdon): Address book/cards.

export type MailboxProps = { mailbox: MailboxType; options?: MailboxOptions };

export const Mailbox = ({ mailbox, options = {} }: MailboxProps) => {
  const [selected, setSelected] = useState<string>();
  const queue = useQueue<MessageType>(mailbox.queue.dxn);
  const tRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(tRef.current);
    if (selected) {
      tRef.current = setTimeout(() => {
        const object = queue?.items?.find((message) => message.id === selected);
        if (object?.properties) {
          setMessageProperty(object, 'read', true);
        }
      }, options?.readTimout ?? DEFAULT_READ_TIMEOUT);
    }

    return () => clearTimeout(tRef.current);
  }, [selected]);

  const messages = [...(queue?.items ?? [])]
    .filter(
      (message) =>
        message.properties?.state !== MessageState.ARCHIVED && message.properties?.state !== MessageState.DELETED,
    )
    .sort(byDate());

  const handleAction = (message: MessageType, action: ActionType) => {
    switch (action) {
      case 'archive': {
        setMessageProperty(message, 'state', MessageState.ARCHIVED);
        setSelected(undefined);
        break;
      }
      case 'delete': {
        setMessageProperty(message, 'state', MessageState.DELETED);
        setSelected(undefined);
        break;
      }
      case 'unread': {
        setMessageProperty(message, 'read', false);
        break;
      }
    }
  };

  return <MessageList messages={messages} selected={selected} onSelect={setSelected} onAction={handleAction} />;
};
