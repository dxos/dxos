//
// Copyright 2023 DXOS.org
//

import { Archive, ArrowClockwise, Trash } from '@phosphor-icons/react';
import React, { type MouseEvent, useState } from 'react';

import { type MessageType } from '@braneframe/types';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph } from '@dxos/react-ui-deck';
import { baseSurface, fixedBorder, focusRing, getSize, ghostHover, mx } from '@dxos/react-ui-theme';

import { INBOX_PLUGIN } from '../../meta';
import { styles } from '../styles';
import { formatDate } from '../util';

export type ActionType = 'archive' | 'delete' | 'unread';

export type MessageListProps = {
  messages?: MessageType[];
  selected?: string;
  onSelect?: (id: string) => void;
  onAction?: (message: MessageType, action: ActionType) => void;
};

// TODO(burdon): Factor out list (and implement navigation).
export const MessageList = ({ messages = [], selected, onSelect, onAction }: MessageListProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  return (
    <div className={mx('flex flex-col is-full py-2 pr-2', baseSurface)}>
      {!messages?.length && <div className='flex items-center justify-center p-4 font-thin'>{t('no messages')}</div>}
      {messages?.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          selected={message.id === selected}
          onSelect={onSelect ? () => onSelect(message.id) : undefined}
          onAction={onAction ? (action) => onAction(message, action) : undefined}
        />
      ))}
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
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation(INBOX_PLUGIN);

  const handleAction = (event: MouseEvent<HTMLButtonElement>, action: ActionType) => {
    event.stopPropagation();
    onAction?.(action);
  };

  const date = message.timestamp ? new Date(message.timestamp) : new Date();
  const from = message.sender?.name ?? message.sender?.email;
  const subject = message.properties?.subject ?? message.text;
  const now = new Date();

  return (
    <DensityProvider density='fine'>
      <div
        className={mx('group flex p-2 gap-1 border', focusRing, fixedBorder, ghostHover, selected && styles.selected)}
        tabIndex={0}
        onClick={() => onSelect?.()}
      >
        <div className='flex w-8 h-8 justify-center items-center'>
          {selected && (
            <span {...{ 'data-attention': 'true' }}>
              <AttentionGlyph presence='none' />
            </span>
          )}
        </div>

        <div className='flex flex-col is-full overflow-hidden'>
          <div
            className={mx('flex h-8 items-center justify-between text-sm fg-description cursor-pointer')}
            onClick={() => setExpanded((expanded) => !expanded)}
          >
            <div className='grow overflow-hidden truncate py-2'>{from}</div>
            {onAction && (
              <div className='hidden group-hover:flex flex shrink-0'>
                {message.properties?.read && (
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
            <div className={mx('shrink-0 whitespace-nowrap p-2 text-sm', onAction && 'group-hover:hidden')}>
              {formatDate(now, date)}
            </div>
          </div>

          <div
            className={mx(
              'mb-1 mr-2 overflow-hidden line-clamp-3 cursor-pointer',
              message.properties?.read && 'fg-description',
            )}
            onClick={() => setExpanded((event) => !event)}
          >
            {subject}
          </div>

          {expanded && (
            <div className='flex flex-col gap-2 pbs-2 pb-4 mt-2 border-bs-2 separator-separator'>
              <div className='grid grid-cols-[1fr,9rem] gap-2 fg-description'>
                <div>{message.text}</div>
                <div className='px-2 text-right text-sm'>{formatDate(now, new Date(message.timestamp))}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DensityProvider>
  );
};
