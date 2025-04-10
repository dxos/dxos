//
// Copyright 2024 DXOS.org
//

import './mailbox.css';

import React, { type MouseEvent, useCallback, useState, type WheelEvent } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { useAttention } from '@dxos/react-ui-attention';
import { type DxGridPlaneCells, Grid, type GridContentProps, toPlaneCellIndex } from '@dxos/react-ui-grid';
import { type MessageType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { type MailboxType } from '../../types';
import { formatDate } from '../util';

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

const renderMessageCell = (message: MessageType, now: Date, isCurrent?: boolean) => {
  const id = message.id;
  const text = message.blocks.find((block) => block.type === 'text')?.text;
  const date = formatDate(now, message.created ? new Date(message.created) : new Date());
  const from = message.sender?.name ?? message.sender?.email;
  const subject = message.properties?.subject ?? text;
  const hue = toHue(hashString(from));

  return `<button
      class="message__thumb dx-focus-ring-inset"
      data-inbox-action="select-message"
      data-message-id="${id}"
      ><dx-avatar
        hue="${hue}"
        hueVariant="surface"
        variant="square"
        fallback="${from ? getFirstTwoRenderableChars(from).join('') : '?'}"
      ></dx-avatar
    ></button
    ><button
      class="message__abstract dx-focus-ring-inset"
      data-inbox-action="current-message"
      data-message-id="${id}"
      ><p class="message__abstract__heading"
        ><span class="message__abstract__from">${from}</span
        ><span class="message__abstract__date">${date}</span
      ></p
      ><p class="message__abstract__body">${subject}</p
  ></button>`;
};

const messageCellClassName = 'message';

// TODO(burdon): Extract contacts/orgs.
// TODO(burdon): Split message body into parts and allow trim (e.g., remove forwarded part). Message as light stack?
// TODO(burdon): Highlight message/chunks for action (e.g., follow-up, triggers embedding).
// TODO(burdon): Create outline/kanban.
// TODO(burdon): Address book/cards.

export type MailboxAction = 'select' | 'current';
export type MailboxActionHandler = (payload: { action: MailboxAction; messageId: string }) => void;

export type MailboxProps = Pick<MailboxType, 'name'> & {
  id: string;
  messages: MessageType[];
  ignoreAttention?: boolean;
  currentMessageId?: string;
  onAction?: MailboxActionHandler;
};

export const Mailbox = ({ messages, id, currentMessageId, onAction, ignoreAttention }: MailboxProps) => {
  // TODO(thure): The container should manage the queue.
  const { hasAttention } = useAttention(id);
  const [columnDefault, setColumnDefault] = useState(messageColumnDefault);

  const handleResize = useCallback<OnResizeCallback>(
    ({ width }) => width && setColumnDefault({ grid: { size: width } }),
    [],
  );

  const { ref: measureRef } = useResizeDetector({
    onResize: handleResize,
  });

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const actionEl = target.closest('[data-inbox-action]');
      if (actionEl) {
        const messageId = actionEl.getAttribute('data-message-id')!;
        const action = actionEl.getAttribute('data-inbox-action')!;
        switch (action) {
          case 'select-message':
            onAction?.({ action: 'select', messageId });
            break;
          case 'current-message':
            onAction?.({ action: 'current', messageId });
            break;
        }
      }
    },
    [onAction],
  );

  const getCells = useCallback<NonNullable<GridContentProps['getCells']>>(
    (range, plane) => {
      if (messages) {
        const now = new Date();
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < messages.length; row++) {
              const isCurrent = currentMessageId === messages[row].id;
              cells[toPlaneCellIndex({ col: 0, row })] = {
                readonly: true,
                accessoryHtml: renderMessageCell(messages[row], now, isCurrent),
                className: `${messageCellClassName}${isCurrent ? ' message--current' : ''}`,
              };
            }
            return cells;
          }
        }
      }
      return {} as DxGridPlaneCells;
    },
    [messages, currentMessageId],
  );

  return (
    <Grid.Root id={`${id}__grid`}>
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
