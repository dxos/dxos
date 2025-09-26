//
// Copyright 2024 DXOS.org
//

import './mailbox.css';

import React, { useCallback, useMemo, useState } from 'react';
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
import { getFirstTwoRenderableChars, trim } from '@dxos/util';

import { getMessageProps } from '../util';

import { type Tag } from './model';

const ROW_SIZES = {
  DEFAULT: 60,
};

const messageRowDefault = {
  grid: { size: ROW_SIZES.DEFAULT },
};

const messageColumnDefault = {
  grid: { size: 100 },
};

const renderMessageCell = (message: DataType.Message, now: Date, _isCurrent?: boolean) => {
  const { id, hue, from, date, subject } = getMessageProps(message, now);

  // NOTE: Currently all grid cells have borders, so we render a single cell for each row.
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
        size="10"
        fallback="${from ? getFirstTwoRenderableChars(from).join('') : '?'}"
      ></dx-avatar>
    </button>
    <button
      class="message__abstract dx-focus-ring-inset"
      data-inbox-action="current-message"
      data-message-id="${id}"
    >
      <div class="message__abstract__heading">
        <div class="message__abstract__from">${from}</div>
        <div class="message__abstract__date">${date}</div>
      </div>
      <div class="message__abstract__body">
        <div class="message__snippet">${subject}</div>
        <div class="message__tags">
          ${message.properties?.tags.map((tag: Tag) => `<div class="dx-tag message__tags-item" data-label="${tag.label}" data-hue=${tag.hue}>${tag?.label}</div>`).join('')}
        </div>
      </div>
    </button>
  `;
};

const messageCellClassName = 'message';

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
  role?: string;
};

export const Mailbox = ({ messages, id, currentMessageId, onAction, ignoreAttention, role }: MailboxProps) => {
  const { hasAttention } = useAttention(id);
  const [columnDefault, setColumnDefault] = useState(messageColumnDefault);

  const handleResize = useCallback<OnResizeCallback>(
    ({ width }) => width && setColumnDefault({ grid: { size: width } }),
    [],
  );

  const { ref: measureRef } = useResizeDetector({
    onResize: handleResize,
  });

  const handleClick = useCallback<NonNullable<GridContentProps['onClick']>>(
    (event) => {
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

  const handleKeyUp = useCallback<NonNullable<GridContentProps['onKeyUp']>>(
    (event) => {
      switch (event.key) {
        case ' ':
        case 'Enter':
          onAction?.({ type: 'select', messageId: currentMessageId! });
          break;
      }
    },
    [currentMessageId, onAction],
  );

  const handleWheel = useCallback<NonNullable<GridContentProps['onWheelCapture']>>(
    (event) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
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
                className: mx(messageCellClassName, isCurrent && 'message--current'),
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

  const gridRows = useMemo(() => {
    return messages.reduce(
      (acc, _, idx) => {
        acc[idx] = {
          size: ROW_SIZES.DEFAULT,
        };

        return acc;
      },
      {} as Record<number, { size: number }>,
    );
  }, [messages]);

  const rows = useMemo(() => ({ grid: gridRows }), [gridRows]);

  return (
    <div role='none' className={mx('flex flex-col [&_.dx-grid]:grow', role !== 'section' && '[&_.dx-grid]:bs-0')}>
      <Grid.Root id={`${id}__grid`}>
        <Grid.Content
          className={mx(
            '[--dx-grid-base:var(--dx-baseSurface)] [&_.dx-grid]:max-bs-[--dx-grid-content-block-size] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto',
            gridSeparatorBlockEnd,
          )}
          limitColumns={1}
          limitRows={messages.length}
          columnDefault={columnDefault}
          rowDefault={messageRowDefault}
          rows={rows}
          getCells={getCells}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          onWheelCapture={handleWheel}
          focusIndicatorVariant='stack'
        />
        <div role='none' {...{ inert: '' }} aria-hidden className='absolute inset-inline-0' ref={measureRef} />
      </Grid.Root>
    </div>
  );
};
