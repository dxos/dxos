//
// Copyright 2023 DXOS.org
//

import './mailbox.css';

import { Archive, ArrowClockwise, Trash } from '@phosphor-icons/react';
import React, { type MouseEvent, useCallback, useEffect, useState, type WheelEvent } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { Button, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, useAttention } from '@dxos/react-ui-attention';
import { type DxGridElement, type DxGridPlaneCells, Grid, toPlaneCellIndex } from '@dxos/react-ui-grid';
import { fixedBorder, focusRing, getSize, ghostHover, mx } from '@dxos/react-ui-theme';
import { type MessageType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { INBOX_PLUGIN } from '../../meta';
import { styles } from '../styles';
import { formatDate } from '../util';

export type ActionType = 'archive' | 'delete' | 'unread';

export type MessageListProps = {
  messages?: MessageType[];
  selected?: string;
  onSelect?: (id: string) => void;
  onAction?: (message: MessageType, action: ActionType) => void;
  attendableId?: string;
  ignoreAttention?: boolean;
};

const messageRowDefault = {
  grid: { size: 56 },
};

const messageColumnDefault = {
  grid: { size: 100 },
};

const hashString = (str?: string): number => {
  if (!str) {
    return 0;
  }
  return Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0));
};

const renderMessageCell = (message: MessageType, now: Date) => {
  const text = message.blocks.find((block) => block.type === 'text')?.text;
  const date = formatDate(now, message.created ? new Date(message.created) : new Date());
  const from = message.sender?.name ?? message.sender?.email;
  const subject = message.properties?.subject ?? text;
  const hue = toHue(hashString(from));

  return `<div class="message__thumb" role="none"
    ><dx-avatar hue=${hue} variant="square" hueVariant="surface" fallback="${from ? getFirstTwoRenderableChars(from).join('') : '?'}"></dx-avatar
  ></div><div class="message__abstract" role="none"
    ><h3 class="message__abstract__row" role="none"><span>${from}</span><span>${date}</span></h3
    ><p>${subject}</p
  ></div>`;
};

const messageCellClassName = 'message';

// TODO(burdon): Factor out list (and implement navigation).
export const MessageList = ({
  messages = [],
  selected,
  onSelect,
  onAction,
  attendableId,
  ignoreAttention,
}: MessageListProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const { hasAttention } = useAttention(attendableId);
  const [columnDefault, setColumnDefault] = useState(messageColumnDefault);

  const handleResize = useCallback<OnResizeCallback>(
    ({ width }) => width && setColumnDefault({ grid: { size: width } }),
    [],
  );

  const { ref: measureRef } = useResizeDetector({
    onResize: handleResize,
    refreshOptions: { leading: true },
    refreshMode: 'debounce',
    refreshRate: 16,
  });

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  useEffect(() => {
    if (dxGrid && messages) {
      dxGrid.getCells = (range, plane) => {
        const now = new Date();
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < messages.length; row++) {
              cells[toPlaneCellIndex({ col: 0, row })] = {
                readonly: true,
                accessoryHtml: renderMessageCell(messages[row], now),
                className: messageCellClassName,
              };
            }
            return cells;
          }
          default:
            return {};
        }
      };
    }
  }, [dxGrid, messages]);

  return (
    <Grid.Root id={`${attendableId}__grid`}>
      <Grid.Content
        limitColumns={1}
        limitRows={messages.length}
        rowDefault={messageRowDefault}
        columnDefault={columnDefault}
        onWheel={handleWheel}
        className='[--dx-grid-base:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto'
        ref={setDxGrid}
      />
      <div role='none' {...{ inert: '' }} aria-hidden className='absolute inset-inline-0' ref={measureRef} />
    </Grid.Root>
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

  const text = message.blocks.find((block) => block.type === 'text')?.text;
  const date = message.created ? new Date(message.created) : new Date();
  const from = message.sender?.name ?? `${message.sender?.email} (${hashString(message.sender?.email)})`;
  const subject = message.properties?.subject ?? text;
  const now = new Date();

  return (
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
          className={mx('flex h-8 items-center justify-between text-sm text-description cursor-pointer')}
          onClick={() => setExpanded((expanded) => !expanded)}
        >
          <div className='grow overflow-hidden truncate py-2'>{from}</div>
          {onAction && (
            <div className='hidden group-hover:flex shrink-0'>
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
            message.properties?.read && 'text-description',
          )}
          onClick={() => setExpanded((event) => !event)}
        >
          {subject}
        </div>

        {expanded && (
          <div className='flex flex-col gap-2 pbs-2 pb-4 mt-2'>
            <div className='grid grid-cols-[1fr,9rem] gap-2 text-description'>
              <div className='whitespace-pre-line'>{text}</div>
              <div className='px-2 text-right text-sm'>{formatDate(now, new Date(message.created))}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
