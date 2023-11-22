//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { useTranslation } from '@dxos/react-ui';
import { fixedBorder, getSize, ghostHover, inputSurface, mx } from '@dxos/react-ui-theme';

import { formatDate } from './util';
import { INBOX_PLUGIN } from '../meta';

// TODO(burdon): Factor out.
export const styles = {
  selected: '!bg-primary-100 dark:!bg-primary-700',
};

export type MessageListProps = {
  messages?: MessageType[];
  selected?: string;
  onSelect?: (selected: MessageType) => void;
};

export const MessageList = ({ messages = [], selected, onSelect }: MessageListProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  // TODO(burdon): Use List component for keyboard navigation.
  return (
    <div className={mx('flex flex-col grow max-w-[400px] overflow-hidden', inputSurface)}>
      <div className='flex flex-col overflow-y-auto'>
        {!messages?.length && <div className='flex items-center justify-center p-4 font-thin'>{t('no messages')}</div>}
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
      className={mx('flex p-2 cursor-pointer border-b', fixedBorder, ghostHover, selected && styles.selected)}
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
