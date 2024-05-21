//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { MessageState, type MailboxType, type MessageType } from '@braneframe/types';
import { fixedBorder, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MessageList, type ActionType } from './MessageList';
import { MasterDetail } from '../MasterDetail';

const DEFAULT_READ_TIMEOUT = 3_000;

const byDate =
  (direction = -1) =>
  ({ date: a = '' }: MessageType, { date: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

export type MailboxOptions = {
  readTimout?: number;
};

// TODO(burdon): Extract contacts/orgs.
// TODO(burdon): Split message body into parts and allow trim (e.g., remove forwarded part). Message as light stack?
// TODO(burdon): Highlight message/chunks for action (e.g., follow-up, triggers embedding).
// TODO(burdon): Create outline/kanban.
// TODO(burdon): Address book/cards.

export type MailboxProps = {
  mailbox: MailboxType;
  options?: MailboxOptions;
};

export const Mailbox = ({ mailbox, options = {} }: MailboxProps) => {
  const [selected, setSelected] = useState<MessageType>();
  const tRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(tRef.current);
    if (selected) {
      tRef.current = setTimeout(() => {
        selected.read = true;
      }, options?.readTimout ?? DEFAULT_READ_TIMEOUT);
    }
    return () => {
      clearTimeout(tRef.current);
    };
  }, [selected]);

  const messages = [...(mailbox.messages ?? [])]
    .filter(nonNullable) // TODO(burdon): API issue.
    .filter((message) => message.state !== MessageState.ARCHIVED && message.state !== MessageState.DELETED)
    .sort(byDate());

  const handleAction = (message: MessageType, action: ActionType) => {
    switch (action) {
      case 'archive': {
        message.state = MessageState.ARCHIVED;
        setSelected(undefined);
        break;
      }
      case 'delete': {
        message.state = MessageState.DELETED;
        setSelected(undefined);
        break;
      }
      case 'unread': {
        message.read = false;
        break;
      }
    }
  };

  return (
    <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>
      <MasterDetail detail={selected && <div className='text-sm'>{selected.blocks[0]?.content?.content}</div>}>
        <MessageList messages={messages} selected={selected?.id} onSelect={setSelected} onAction={handleAction} />
      </MasterDetail>
    </div>
  );
};
