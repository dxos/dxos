//
// Copyright 2023 DXOS.org
//

import { ArrowClockwise, Archive, Circle, Trash } from '@phosphor-icons/react';
import React, { type MouseEvent } from 'react';

import { type MessageType } from '@braneframe/types';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { fixedBorder, getSize, ghostHover, attentionSurface, mx } from '@dxos/react-ui-theme';

import { INBOX_PLUGIN } from '../../meta';
import { styles } from '../styles';
import { formatDate } from '../util';

export type ActionType = 'archive' | 'delete' | 'unread';

export type MessageListProps = {
  messages?: MessageType[];
  selected?: string;
  onSelect?: (message: MessageType) => void;
  onAction?: (message: MessageType, action: ActionType) => void;
};

// TODO(burdon): Factor out list (and implement navigation).
export const MessageList = ({ messages = [], selected, onSelect, onAction }: MessageListProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  return (
    <div className={mx('flex flex-col grow overflow-hidden', styles.columnWidth, attentionSurface)}>
      <div className='flex flex-col overflow-y-auto'>
        {!messages?.length && <div className='flex items-center justify-center p-4 font-thin'>{t('no messages')}</div>}
        {messages?.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            selected={message.id === selected}
            onSelect={onSelect ? () => onSelect(message) : undefined}
            onAction={onAction ? (action) => onAction(message, action) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export type MessageItemProps = {
  message: MessageType;
  selected?: boolean;
  onSelect?: () => void;
  onAction?: (action: ActionType) => void;
};

export const MessageItem = ({ message, selected, onSelect, onAction }: MessageItemProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  const handleAction = (event: MouseEvent<HTMLButtonElement>, action: ActionType) => {
    event.stopPropagation();
    onAction?.(action);
  };

  const date = message.date ? new Date(message.date) : new Date();
  const from = message.from?.name ?? message.from?.email;
  const subject = message.subject ?? message.blocks[0].content?.content;
  return (
    <DensityProvider density='fine'>
      <div
        className={mx('group flex cursor-pointer border-b', fixedBorder, ghostHover, selected && styles.selected)}
        onClick={() => onSelect?.()}
      >
        <div>
          <Button variant='ghost' onClick={() => onSelect?.()}>
            <Circle className={getSize(4)} weight={selected ? 'duotone' : 'regular'} />
          </Button>
        </div>

        <div className='flex flex-col w-full overflow-hidden'>
          <div className={mx('flex text-sm justify-between text-neutral-500 pb-1', !selected && 'font-thin')}>
            <div className='grow overflow-hidden truncate py-2'>{from}</div>
            {onAction && (
              <div className='hidden group-hover:flex flex shrink-0'>
                {message.read && (
                  <Button
                    variant='ghost'
                    title={t('action mark read')}
                    onClick={(event) => handleAction(event, 'unread')}
                  >
                    <ArrowClockwise className={getSize(4)} />
                  </Button>
                )}
                <Button variant='ghost' title={t('action archive')} onClick={(event) => handleAction(event, 'archive')}>
                  <Archive className={getSize(4)} />
                </Button>
                <Button variant='ghost' title={t('action delete')} onClick={(event) => handleAction(event, 'delete')}>
                  <Trash className={getSize(4)} />
                </Button>
              </div>
            )}
            <div className={mx('shrink-0 whitespace-nowrap p-2', onAction && 'group-hover:hidden')}>
              {formatDate(new Date(), date)}
            </div>
          </div>
          <div className={mx('mb-1 mr-2 overflow-hidden line-clamp-3', message.read && 'text-neutral-500')}>
            {subject}
          </div>
        </div>
      </div>
    </DensityProvider>
  );
};
