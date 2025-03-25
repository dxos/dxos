//
// Copyright 2023 DXOS.org
//

import { intervalToDuration } from 'date-fns/intervalToDuration';
import React, { type FC, useCallback, useEffect, useLayoutEffect, useRef, useState, type WheelEvent } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridCellValue,
  type DxGridElement,
  type DxGridAxisMeta,
  type DxGridPlaneCells,
  Grid,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

const timeWidth = 70;
const lineHeight = 24;
const cellSpacing = 6;

const authorClasses = 'text-[16px] leading-[24px] dx-tag';
const segmentTextClasses = 'text-[16px] leading-[24px] whitespace-pre-wrap break-words hyphens-none';

/**
 * Projected row.
 */
type TranscriptRow = { blockId: string; size: number; author?: string; ts?: Date; text?: string };

export type TranscriptProps = {
  attendableId?: string;
  ignoreAttention?: boolean;
  blocks?: TranscriptBlock[];
};

// TODO(burdon): Autoscroll.
export const Transcript: FC<TranscriptProps> = ({ attendableId, ignoreAttention, blocks }) => {
  const { hasAttention } = useAttention(attendableId);
  const { ref, width } = useResizeDetector();

  const textWidth = width ? width - timeWidth : 0;
  const columnMeta = width
    ? {
        grid: {
          0: { size: timeWidth },
          1: { size: textWidth },
        },
      }
    : undefined;

  const rows = useRows(blocks);
  const [rowMeta, setRowMeta] = useState<DxGridAxisMeta>({ grid: {} });
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  useEffect(() => {
    if (dxGrid && Array.isArray(blocks)) {
      const start = blocks[0]?.segments[0]?.started ?? 0;

      dxGrid.getCells = (range, plane) => {
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < rows.length; row++) {
              const { author, ts, text } = rows[row];

              cells[toPlaneCellIndex({ col: 0, row })] = (
                ts
                  ? {
                      readonly: true,
                      accessoryHtml: `<span class="pbs-1 text-xs text-neutral-500">${formatTimestamp(start, ts)}</span>`,
                    }
                  : {}
              ) satisfies DxGridCellValue;

              cells[toPlaneCellIndex({ col: 1, row })] = (
                author
                  ? {
                      readonly: true,
                      value: author,
                      // TODO(burdon): Color based on username.
                      className: authorClasses,
                    }
                  : {
                      readonly: true,
                      accessoryHtml: `<div class="${segmentTextClasses}">${text}</div>`,
                    }
              ) satisfies DxGridCellValue;
            }

            return cells;
          }
          default:
            return {};
        }
      };

      return () => {
        dxGrid.getCells = null;
      };
    }
  }, [dxGrid, rows, blocks]);

  const handleWheel = useCallback(
    (ev: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        ev.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  return (
    <div role='none' ref={ref} className='grow'>
      {columnMeta && (
        <>
          <Measuring
            rows={rows}
            width={columnMeta.grid['1'].size}
            onUpdate={(rows) => setRowMeta(createRowMeta(rows))}
          />
          <Grid.Root id={`${attendableId}--transcript`}>
            <Grid.Content
              ref={setDxGrid}
              className='[--dx-grid-base:var(--dx-baseSurface)] [--dx-grid-lines:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:select-auto'
              columns={columnMeta}
              rows={rowMeta}
              limitColumns={2}
              limitRows={rows.length}
              onWheel={handleWheel}
            />
          </Grid.Root>
        </>
      )}
    </div>
  );
};

/**
 * Format elapsed time.
 */
export const formatTimestamp = (start: Date, end: Date) => {
  const { hours, minutes, seconds } = intervalToDuration({ start, end });
  const pad = (n = 0) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Create row meta (with heights)from rows.
 */
const createRowMeta = (rows: TranscriptRow[]): DxGridAxisMeta => ({
  grid: rows.reduce<DxGridAxisMeta['grid']>((acc, item, rowIndex) => {
    const size = item.size;
    acc[rowIndex] = { size };
    return acc;
  }, {}),
});

/**
 * Compute flattened rows from blocks.
 */
const useRows = (blocks?: TranscriptBlock[]): TranscriptRow[] => {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  useEffect(() => {
    for (const block of blocks ?? []) {
      const { author, segments } = block;
      rows.push({ blockId: block.id, author, size: lineHeight });
      for (const segment of segments) {
        const { started, text } = segment;
        rows.push({ blockId: block.id, ts: started, text: text.trim(), size: lineHeight });
      }
    }
    setRows(rows);
  }, [blocks]);

  return rows;
};

/**
 * Render rows offscreen and measure heights.
 */
const Measuring = ({
  rows,
  width,
  onUpdate,
}: {
  rows: TranscriptRow[];
  width: number;
  onUpdate: (rows: TranscriptRow[]) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const div = ref.current;
    if (div) {
      for (let i = 0; i < div.children.length; i++) {
        const row: HTMLDivElement = div.children[i].children[0] as HTMLDivElement;
        rows[i].size = row.offsetHeight + cellSpacing;
      }

      onUpdate(rows);
    }
  }, [rows]);

  return (
    <div ref={ref} className='absolute top-0 z-10 invisible'>
      {rows.map(({ author, text }, i) => (
        <div key={i} className='p-1 border' style={{ width }}>
          <div className={mx(segmentTextClasses)}>{author ?? text}</div>
        </div>
      ))}
    </div>
  );
};
