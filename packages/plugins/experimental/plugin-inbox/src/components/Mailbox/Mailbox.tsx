//
// Copyright 2024 DXOS.org
//

import './mailbox.css';

import React, { type MouseEvent, useCallback, useEffect, useRef, useState, useMemo, type WheelEvent } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { useQueue } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { type DxGridPlaneCells, Grid, type GridContentProps, toPlaneCellIndex } from '@dxos/react-ui-grid';
import { type MessageType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { type MailboxType, MessageState } from '../../types';
import { formatDate } from '../util';

const DEFAULT_READ_TIMEOUT = 3_000;

const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

const updateMessageProperty = (messages: MessageType[], property: string, value: any) => {
  messages.forEach((message) => {
    if (!message.properties) {
      message.properties = {};
    }

    message.properties[property] = value;
  });
};

export type MailboxOptions = { readTimout?: number };

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

  return `<button class="message__thumb dx-focus-ring-inset" data-inbox-action="select-message" data-message-id="${message.id}"
    ><dx-avatar hue=${hue} variant="square" hueVariant="surface" fallback="${from ? getFirstTwoRenderableChars(from).join('') : '?'}"></dx-avatar
  ></button><button class="message__abstract dx-focus-ring-inset" data-inbox-action="current-message" data-message-id="${message.id}"
    ><p class="message__abstract__heading" role="none"><span>${from}</span><span>${date}</span></p
    ><p class="message__abstract__body">${subject}</p
  ></button>`;
};

const messageCellClassName = 'message';

// TODO(burdon): Extract contacts/orgs.
// TODO(burdon): Split message body into parts and allow trim (e.g., remove forwarded part). Message as light stack?
// TODO(burdon): Highlight message/chunks for action (e.g., follow-up, triggers embedding).
// TODO(burdon): Create outline/kanban.
// TODO(burdon): Address book/cards.

export type MailboxProps = { mailbox: MailboxType; options?: MailboxOptions; ignoreAttention?: boolean };

export const Mailbox = ({ mailbox, options = {}, ignoreAttention }: MailboxProps) => {
  const [currentMessageId, setCurrentMessageId] = useState<string>();
  const queue = useQueue<MessageType>(mailbox.queue.dxn, { pollInterval: 1_000 });
  const tRef = useRef<ReturnType<typeof setTimeout>>();
  const { hasAttention } = useAttention(mailbox.id);
  const [columnDefault, setColumnDefault] = useState(messageColumnDefault);
  useEffect(() => {
    clearTimeout(tRef.current);
    if (currentMessageId) {
      tRef.current = setTimeout(() => {
        const object = queue?.items?.find((message) => message.id === currentMessageId);
        if (object?.properties) {
          updateMessageProperty([object], 'read', true);
        }
      }, options?.readTimout ?? DEFAULT_READ_TIMEOUT);
    }

    return () => clearTimeout(tRef.current);
  }, [currentMessageId]);

  const messages = useMemo(
    () =>
      [...(queue?.items ?? [])]
        .filter(
          (message) =>
            message.properties?.state !== MessageState.ARCHIVED && message.properties?.state !== MessageState.DELETED,
        )
        .sort(byDate()),
    [queue?.items?.length],
  );

  const _handleMailboxAction = (messages: MessageType[], action: 'archive' | 'delete' | 'unread') => {
    switch (action) {
      case 'archive': {
        updateMessageProperty(messages, 'state', MessageState.ARCHIVED);
        setCurrentMessageId(undefined);
        break;
      }
      case 'delete': {
        updateMessageProperty(messages, 'state', MessageState.DELETED);
        setCurrentMessageId(undefined);
        break;
      }
      case 'unread': {
        updateMessageProperty(messages, 'read', false);
        break;
      }
    }
  };

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

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const actionEl = target.closest('[data-inbox-action]');
    if (actionEl) {
      const messageId = actionEl.getAttribute('data-message-id')!;
      const action = actionEl.getAttribute('data-inbox-action')!;
      switch (action) {
        case 'select-message':
          // console.log('[select message]', messageId);
          break;
        case 'current-message':
          // console.log('[current message]', messageId);
          break;
      }
    }
  }, []);

  const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
    (range, plane) => {
      if (messages) {
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
        }
      }
      return {} as DxGridPlaneCells;
    },
    [messages],
  );

  return (
    <Grid.Root id={`${mailbox.id}__grid`}>
      <Grid.Content
        limitColumns={1}
        limitRows={messages.length}
        rowDefault={messageRowDefault}
        columnDefault={columnDefault}
        onWheel={handleWheel}
        onClick={handleClick}
        getCells={getCells}
        className='[--dx-grid-base:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto'
      />
      <div role='none' {...{ inert: '' }} aria-hidden className='absolute inset-inline-0' ref={measureRef} />
    </Grid.Root>
  );
};
