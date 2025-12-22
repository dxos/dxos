//
// Copyright 2023 DXOS.org
//

import { intervalToDuration } from 'date-fns/intervalToDuration';
import * as Schema from 'effect/Schema';
import { yieldOrContinue } from 'main-thread-scheduling';
import React, { type FC, type WheelEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type OnResizeCallback, useResizeDetector } from 'react-resize-detector';

import { Type } from '@dxos/echo';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridAxisMeta,
  type DxGridCellValue,
  type DxGridElement,
  type DxGridPlaneCells,
  Grid,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../../meta';

/**
 * Transcription fragment.
 */
const TranscriptSegment = Schema.Struct({
  // TODO(burdon): TS from service is not Unix TS (x1000).
  started: Schema.String,
  text: Schema.String,
});

type TranscriptSegment = Schema.Schema.Type<typeof TranscriptSegment>;

/**
 * Transcription block (from single speaker).
 */
const TranscriptBlock = Schema.Struct({
  id: Schema.String,
  authorName: Schema.optional(Schema.String), // TODO(burdon): Replace with identityDid.
  authorHue: Schema.optional(Schema.String), // TOOD(burdon): Remove.
  segments: Schema.Array(TranscriptSegment),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/TranscriptBlock',
    version: '0.1.0',
  }),
);

type TranscriptBlock = Schema.Schema.Type<typeof TranscriptBlock>;

// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

const lineHeight = 20;
const cellSpacing = 8 + 2;
const timestampColumnWidth = 68;

const authorClasses = 'font-medium text-base leading-[20px]';
const timestampClasses = 'text-xs leading-[20px] text-description pie-0 tabular-nums';
const segmentTextClasses = 'text-sm whitespace-normal hyphens-auto';
const measureClasses = mx(
  // NOTE(thure): The `inline-start` value must equal `timestampColumnWidth` plus grid’s gap (1px)
  'absolute inline-start-[69px] inline-end-0 invisible z-[-1] border',
  'pli-[--dx-grid-cell-padding-inline] plb-[--dx-grid-cell-padding-block] leading-[20px]',
  segmentTextClasses,
);

const rowDefault = {
  grid: { size: lineHeight + cellSpacing },
};

type QueueRows = [number, number][];

const mapTranscriptQueue = (blocks?: TranscriptBlock[]): QueueRows => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return [];
  } else {
    return blocks.flatMap((block, blockIndex) => {
      return [
        [blockIndex, -1],
        ...block.segments.map((segment, segmentIndex) => {
          return [blockIndex, segmentIndex] as [number, number];
        }),
      ];
    });
  }
};

const pad = (n = 0) => String(n).padStart(2, '0');

const formatTimestamp = (start: Date, end: Date) => {
  const { hours, minutes, seconds } = intervalToDuration({ start, end });
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const measureRows = async (
  host: HTMLDivElement,
  blocks: TranscriptBlock[],
  queueMap: QueueRows,
  signal: AbortSignal,
) => {
  const result: DxGridAxisMeta = { grid: {} };
  for (let row = 0; row < queueMap.length; row++) {
    await yieldOrContinue('smooth', signal);
    const [blockIndex, segmentIndex] = queueMap[row];
    if (segmentIndex < 0) {
      result.grid[row] = { size: lineHeight + cellSpacing };
    } else {
      host.textContent = blocks[blockIndex]!.segments[segmentIndex]!.text;
      result.grid[row] = { size: host.offsetHeight };
    }
  }
  return result;
};

export type TranscriptViewProps = ThemedClassName<{
  blocks?: TranscriptBlock[];
  attendableId?: string;
  ignoreAttention?: boolean;
}>;

/**
 * @@deprecated
 */
export const Transcript: FC<TranscriptViewProps> = ({ classNames, blocks, attendableId, ignoreAttention }) => {
  const { t } = useTranslation(meta.id);
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const [rows, setRows] = useState<DxGridAxisMeta | undefined>(undefined);
  const [columns, setColumns] = useState<DxGridAxisMeta | undefined>(undefined);

  const queueMap = useMemo(() => mapTranscriptQueue(blocks), [blocks]);

  const { hasAttention } = useAttention(attendableId);
  const [autoScroll, setAutoScroll] = useState(true);
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      setAutoScroll(false);
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const abortControllerRef = useRef<AbortController>(null);

  const handleResize = useCallback(
    async ({ entry }: { entry: { target: HTMLDivElement } | null }) => {
      if (entry?.target && Array.isArray(blocks) && blocks[0] && queueMap) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        setColumns({ grid: { 0: { size: timestampColumnWidth }, 1: { size: entry.target.offsetWidth } } });
        return measureRows(entry.target, blocks, queueMap, abortControllerRef.current.signal)
          .then(setRows)
          .catch(() => {
            // Aborted mid-measurement by new size.
          });
      }
    },
    [blocks, queueMap],
  );

  const { width, ref: measureRef } = useResizeDetector({
    onResize: handleResize as OnResizeCallback,
    refreshOptions: { leading: true },
  });

  useEffect(() => {
    if (queueMap.length !== Object.keys(rows?.grid ?? {}).length) {
      void handleResize({ entry: { target: measureRef.current } }).then(() => {
        if (autoScroll) {
          // TODO(thure): Implement a deterministic way to do this when `rows` has fully settled and grid has a new `maxPosBlock`.
          setTimeout(() => dxGrid?.scrollToEndRow(), 50);
        }
      });
    }
  }, [blocks, queueMap, width, autoScroll]);

  useEffect(() => {
    if (dxGrid && Array.isArray(blocks) && blocks[0]) {
      const transcriptStart = blocks[0]!.segments[0]!.started;
      dxGrid.getCells = (range, plane) => {
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < queueMap.length; row++) {
              const [blockIndex, segmentIndex] = queueMap[row];

              cells[toPlaneCellIndex({ col: 0, row })] = {
                readonly: true,
                value:
                  segmentIndex < 0
                    ? formatTimestamp(
                        new Date(transcriptStart),
                        new Date(blocks[blockIndex]!.segments[Math.max(0, segmentIndex)]!.started),
                      )
                    : '',
                className: timestampClasses,
              } satisfies DxGridCellValue;

              cells[toPlaneCellIndex({ col: 1, row })] = (
                segmentIndex < 0
                  ? {
                      readonly: true,
                      accessoryHtml: `<span data-hue="${blocks[blockIndex]!.authorHue}" class="dx-text-hue">${blocks[blockIndex]!.authorName}</span>`,
                      className: authorClasses,
                    }
                  : {
                      readonly: true,
                      value: blocks[blockIndex]!.segments[segmentIndex]!.text,
                      className: segmentTextClasses,
                    }
              ) satisfies DxGridCellValue;
            }
            return cells;
          }
          default:
            return {};
        }
      };
    }
  }, [dxGrid, blocks]);

  const handleScrollToEnd = useCallback(() => {
    setAutoScroll(true);
    dxGrid?.scrollToEndRow();
  }, [dxGrid, autoScroll]);

  return (
    <div role='none' className={mx('relative min-bs-0', classNames)}>
      <Grid.Root id={`${attendableId}--transcript`}>
        <Grid.Content
          limitColumns={2}
          limitRows={queueMap.length}
          columns={columns}
          rows={rows}
          rowDefault={rowDefault}
          onWheel={handleWheel}
          className='[--dx-grid-base:var(--dx-baseSurface)] [--dx-grid-lines:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto'
          ref={setDxGrid}
        />
      </Grid.Root>
      <div role='none' {...{ inert: true }} aria-hidden className={measureClasses} ref={measureRef} />
      <IconButton
        icon='ph--arrow-line-down--regular'
        iconOnly
        label={t('scroll to end label')}
        tooltipSide='left'
        data-state={autoScroll ? 'invisible' : 'visible'}
        classNames={[
          'absolute inline-end-2 block-end-2 opacity-0 pointer-events-none',
          'data-[state="visible"]:pointer-events-auto data-[state="visible"]:opacity-100 transition-opacity',
        ]}
        onClick={handleScrollToEnd}
      />
    </div>
  );
};
