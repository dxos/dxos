//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type MailboxType, MessageState, type MessageType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedBorder, fixedInsetFlexLayout, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { type ActionType, MessageList } from './MessageList';
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

const Mailbox = ({ mailbox, options = {} }: MailboxProps) => {
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
    .filter(nonNullable) // TODO(burdon): Why is this necessary?
    .filter((message) => message.state !== MessageState.ARCHIVED && message.state !== MessageState.DELETED)
    .sort(byDate());

  const handleAction = (message: MessageType, action: ActionType) => {
    switch (action) {
      case 'archive':
        message.state = MessageState.ARCHIVED;
        setSelected(undefined);
        break;
      case 'delete':
        message.state = MessageState.DELETED;
        setSelected(undefined);
        break;
      case 'unread':
        message.read = false;
        break;
    }
  };

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>
        <MasterDetail detail={selected && <pre className='text-sm'>{selected.blocks[0]?.content?.content}</pre>}>
          <MessageList messages={messages} selected={selected?.id} onSelect={setSelected} onAction={handleAction} />
        </MasterDetail>
      </div>
    </Main.Content>
  );
};

export default Mailbox;
