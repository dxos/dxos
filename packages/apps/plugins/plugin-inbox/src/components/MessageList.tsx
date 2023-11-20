//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { formatDate } from './util';

// TODO(burdon): Factor out.
const styles = {
  hover: 'hover:bg-neutral-75 dark:hover:bg-neutral-850',
  selected: '!bg-cyan-100 !dark:bg-cyan-900',
};

export type MessageListProps = {
  messages?: MessageType[];
  selected?: string;
  onSelect?: (selected: MessageType) => void;
};

// TODO(burdon): Use List (see composer settings/kai).

export const MessageList = ({ messages = [], selected, onSelect }: MessageListProps) => {
  return (
    <div className={mx('flex flex-col grow max-w-[400px] overflow-hidden', inputSurface)}>
      <div className='flex flex-col overflow-y-auto divide-y'>
        {messages?.map((message) => (
          <MessageItem key={message.id} message={message} selected={message.id === selected} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

export const MessageItem: FC<{ message: MessageType; selected?: boolean; onSelect: MessageListProps['onSelect'] }> = ({
  message,
  selected,
  onSelect,
}) => {
  const date = message.date;
  const from = message.from?.name ?? message.from?.email;
  const subject = message.subject ?? message.blocks[0].text;
  return (
    <div
      className={mx('flex p-2 cursor-pointer', styles.hover, selected && styles.selected)}
      onClick={() => onSelect?.(message)}
    >
      <div className='flex pr-2 pt-[2px]'>
        <Circle className={getSize(4)} weight={selected ? 'duotone' : 'regular'} />
      </div>
      <div className='flex flex-col w-full'>
        <div className={mx('flex text-sm justify-between text-neutral-500 pb-1', !selected && 'font-thin')}>
          <div>{from}</div>
          <div>{formatDate(new Date(), new Date(date))}</div>
        </div>
        <div>{subject}</div>
      </div>
    </div>
  );
};
