//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type Mailbox as MailboxType, Message as MessageType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  fixedBorder,
  fixedInsetFlexLayout,
  inputSurface,
  topbarBlockPaddingStart,
  mx,
} from '@dxos/react-ui-theme';

import { type ActionType, MessageList } from './MessageList';

const DEFAULT_READ_TIMEOUT = 3_000;

const byDate =
  (direction = -1) =>
  ({ date: a }: MessageType, { date: b }: MessageType) =>
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
  const tRef = useRef<ReturnType<typeof setTimeout>>();
  const [selected, setSelected] = useState<MessageType>();
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

  const messages = [...mailbox.messages]
    .filter((message) => message.state !== MessageType.State.ARCHIVED && message.state !== MessageType.State.DELETED)
    .sort(byDate());

  const handleAction = (message: MessageType, action: ActionType) => {
    switch (action) {
      case 'archive':
        message.state = MessageType.State.ARCHIVED;
        break;
      case 'delete':
        message.state = MessageType.State.DELETED;
        break;
      case 'unread':
        message.read = false;
        break;
    }
  };

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>
        <div className='flex shrink-0 w-[400px] border-r'>
          <MessageList messages={messages} selected={selected?.id} onSelect={setSelected} onAction={handleAction} />
        </div>
        <div className={mx('flex w-full overflow-auto p-4', inputSurface)}>
          {selected && <pre className='text-sm'>{selected.blocks[0].text}</pre>}
        </div>
      </div>
    </Main.Content>
  );
};
