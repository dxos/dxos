//
// Copyright 2024 DXOS.org
//

import './mailbox.css';

import React, { useCallback, useMemo, useState } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { type Filter } from '@dxos/echo';
import { useStateWithRef } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridAxisMeta,
  type DxGridPlaneCells,
  Grid,
  type GridContentProps,
  gridSeparatorBlockEnd,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { type Tag } from '../../types';
import { getMessageProps } from '../util';

const ROW_SIZES = {
  DEFAULT: 60,
};

const messageRowDefault = {
  grid: { size: ROW_SIZES.DEFAULT },
};

const messageColumnDefault = {
  grid: { size: 100 },
};

const renderMessageCell = (message: DataType.Message, now: Date, _current?: boolean) => {
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
        fallback="${from}"
      ></dx-avatar>
    </button>
    <button
      class="message__abstract dx-focus-ring-inset"
      data-inbox-action="current-message"
      data-message-id="${id}"
    >
      <div class="message__abstract__heading">
        <span class="message__abstract__from">${from}</span>
        <span class="message__abstract__date">${date}</span>
      </div>
      <div class="message__abstract__body">
        <div class="message__snippet">${subject}</div>
        <div class="message__tags">
          ${(message.properties?.tags ?? [])
            .map(
              ({ label, hue }: Tag) => trim`
                <span class="dx-tag message__tags-item" data-label="${label}" data-hue="${hue}">${label}</span>
              `,
            )
            .join('\n')}
        </div>
      </div>
    </button>
  `;
};

export type MailboxAction =
  | { type: 'current'; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'save'; filter: Filter.Any };

export type MailboxActionHandler = (action: MailboxAction) => void;

export type MailboxProps = {
  id: string;
  role?: string;
  messages: DataType.Message[];
  currentMessageId?: string;
  ignoreAttention?: boolean;
  onAction?: MailboxActionHandler;
};

export const Mailbox = ({ id, role, messages, currentMessageId, ignoreAttention, onAction }: MailboxProps) => {
  const { hasAttention } = useAttention(id);
  const [columnDefault, setColumnDefault] = useState(messageColumnDefault);
  const [_, setRow, rowRef] = useStateWithRef<number>(-1);

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
        onAction?.({ type: 'select-tag', label });
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
        case 'Enter': {
          if (rowRef.current !== -1) {
            const messageId = messages[rowRef.current]?.id;
            if (messageId) {
              onAction?.({ type: 'current', messageId });
            }
          }
          break;
        }
      }
    },
    [messages, onAction],
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
              const current = currentMessageId === messages[row].id;
              cells[toPlaneCellIndex({ col: 0, row })] = {
                readonly: true,
                accessoryHtml: renderMessageCell(messages[row], now, current),
                className: mx('message', current && 'message--current'),
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

  const rows = useMemo<DxGridAxisMeta>(() => {
    const rows = messages.reduce(
      (acc, _, idx) => {
        acc[idx] = {
          size: ROW_SIZES.DEFAULT,
        };

        return acc;
      },
      {} as Record<number, { size: number }>,
    );

    return { grid: rows };
  }, [messages]);

  return (
    <div
      role='none'
      className={mx(
        'flex flex-col [&_.dx-grid]:grow',
        role !== 'section' && '[&_.dx-grid]:bs-0',
        role === 'story' && 'bs-full',
      )}
    >
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
          focusIndicatorVariant='stack'
          onSelect={(ev) => setRow(ev.minRow)}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          onWheelCapture={handleWheel}
        />
        <div role='none' {...{ inert: true }} aria-hidden className='absolute inset-inline-0' ref={measureRef} />
      </Grid.Root>
    </div>
  );
};
