//
// Copyright 2024 DXOS.org
//

import './mailbox.css';

import React, { type MouseEvent, type WheelEvent, useCallback, useState } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridPlaneCells,
  Grid,
  type GridContentProps,
  gridSeparatorBlockEnd,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue, trim } from '@dxos/util';

import { formatDate, hashString } from '../util';

import { type Tag } from './model';

const ROW_SIZES = {
  DEFAULT: 56,
  WITH_TAG: 76,
};

const messageRowDefault = {
  grid: { size: ROW_SIZES.DEFAULT },
};

const messageColumnDefault = {
  grid: { size: 100 },
};

const renderMessageCell = (message: DataType.Message, now: Date, _isCurrent?: boolean) => {
  const id = message.id;
  // Always use the first text block for display in the mailbox list.
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  const text = textBlocks[0]?.text || '';
  const date = formatDate(now, message.created ? new Date(message.created) : new Date());
  const from = message.sender?.name ?? message.sender?.email;
  const subject = message.properties?.subject ?? text;
  const hue = toHue(hashString(from));

  return trim`
    <button
      class="message__thumb dx-focus-ring-inset"
      data-inbox-action="select-message"
      data-message-id="${id}"
    >
      <dx-avatar
        hue="${hue}"
        hueVariant="surface"
        variant="square"
        size="8"
        fallback="${from ? getFirstTwoRenderableChars(from).join('') : '?'}"
      ></dx-avatar>
    </button>
    <button
      class="message__abstract dx-focus-ring-inset"
      data-inbox-action="current-message"
      data-message-id="${id}"
    >
      <p class="message__abstract__heading">
      <span class="message__abstract__from">${from}</span>
      <span class="message__abstract__date">${date}</span>
      </p>
      <p class="message__abstract__body">${subject}</p>
    ${
      message.properties?.tags
        ? `<div class="message__tag-row">
            ${message.properties.tags.map((tag: Tag) => `<div class="dx-tag message__tag-row__item" data-label="${tag.label}" data-hue=${tag.hue}>${tag?.label}</div>`).join('')}
          </div>`
        : ''
    }
    </button>`;
};

const messageCellClassName = 'message';

// TODO(burdon): Extract contacts/orgs.
// TODO(burdon): Split message body into parts and allow trim (e.g., remove forwarded part). Message as light stack?
// TODO(burdon): Highlight message/chunks for action (e.g., follow-up, triggers embedding).
// TODO(burdon): Create outline/kanban.
// TODO(burdon): Address book/cards.

export type MailboxAction =
  | { type: 'select'; messageId: string }
  | { type: 'current'; messageId: string }
  | { type: 'tag-select'; label: string };

export type MailboxActionHandler = (action: MailboxAction) => void;

export type MailboxProps = {
  id: string;
  messages: DataType.Message[];
  ignoreAttention?: boolean;
  currentMessageId?: string;
  onAction?: MailboxActionHandler;
};

export const Mailbox = ({ messages, id, currentMessageId, onAction, ignoreAttention }: MailboxProps) => {
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
      const label = target.getAttribute('data-label');
      if (label) {
        onAction?.({ type: 'tag-select', label });
        return;
      }

      const actionEl = target.closest('[data-inbox-action]');
      if (actionEl) {
        const messageId = actionEl.getAttribute('data-message-id')!;
        const action = actionEl.getAttribute('data-inbox-action')!;
        switch (action) {
          case 'select-message':
            onAction?.({ type: 'select', messageId });
            break;
          case 'current-message':
            onAction?.({ type: 'current', messageId });
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

  const gridRows = React.useMemo(() => {
    return messages.reduce(
      (acc, _, idx) => {
        const message = messages[idx];
        const hasTags = message.properties?.tags && message.properties.tags.length > 0;

        acc[idx] = {
          size: hasTags ? ROW_SIZES.WITH_TAG : ROW_SIZES.DEFAULT,
        };

        return acc;
      },
      {} as Record<number, { size: number }>,
    );
  }, [messages]);

  const rows = React.useMemo(() => ({ grid: gridRows }), [gridRows]);

  return (
    <div role='none' className='flex flex-col [&_.dx-grid]:grow [&_.dx-grid]:bs-0'>
      <Grid.Root id={`${id}__grid`}>
        <Grid.Content
          limitColumns={1}
          limitRows={messages.length}
          rowDefault={messageRowDefault}
          rows={rows}
          columnDefault={columnDefault}
          onWheelCapture={handleWheel}
          onClick={handleClick}
          getCells={getCells}
          className={mx(
            '[--dx-grid-base:var(--dx-baseSurface)] [&_.dx-grid]:max-bs-[--dx-grid-content-block-size] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto',
            gridSeparatorBlockEnd,
          )}
        />
        <div role='none' {...{ inert: '' }} aria-hidden className='absolute inset-inline-0' ref={measureRef} />
      </Grid.Root>
    </div>
  );
};
