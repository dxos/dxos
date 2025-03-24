//
// Copyright 2023 DXOS.org
//

import { intervalToDuration } from 'date-fns/intervalToDuration';
import React, { type FC, useCallback, useEffect, useRef, useState, type WheelEvent } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { log } from '@dxos/log';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridCellValue,
  type DxGridElement,
  type DxGridAxisMeta,
  type DxGridPlaneCells,
  Grid,
  toPlaneCellIndex,
  type DxGridPlaneRange,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

const timeWidth = 70;
const lineHeight = 24;
const cellSpacing = 12;

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
  const measureRef = useRef<HTMLDivElement>(null);

  const textWidth = width ? width - timeWidth : 0;
  const columnMeta = width
    ? {
        grid: {
          0: { size: timeWidth },
          1: { size: textWidth },
        },
      }
    : undefined;

  // TODO(burdon): Consolidate these two hooks.
  const rows = useTranscriptRows(measureRef.current, blocks);
  const [rowMeta, setRowMeta] = useState<DxGridAxisMeta | null>({ grid: {} });
  useEffect(() => {
    setRowMeta({
      grid: rows.reduce<DxGridAxisMeta['grid']>((acc, item, rowIndex) => {
        const size = item.size;
        acc[rowIndex] = { size };
        return acc;
      }, {}),
    });
  }, [rows]);

  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  useEffect(() => {
    if (dxGrid && Array.isArray(blocks)) {
      const start = blocks[0]?.segments[0]?.started ?? 0;

      dxGrid.getCells = (range, plane) => {
        void updateBlocks(measureRef.current!, rows, range).then((mod) => {
          if (mod) {
            // TODO(burdon): Update grid.
          }
        });

        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < rows.length; row++) {
              const { author, ts, text } = rows[row];

              cells[toPlaneCellIndex({ col: 0, row })] = (
                ts
                  ? {
                      readonly: true,
                      accessoryHtml: `<span class="pbs-1 text-xs text-neutral-500">${formatElapsed(start, ts)}</span>`,
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
    }
  }, [dxGrid, rows, blocks]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  return (
    <div role='none' ref={ref} className='grow'>
      {columnMeta && (
        <>
          <div className='relative'>
            <div
              className='absolute top-0 p-1 bg-black text-white border z-10 _invisible'
              style={{ left: timeWidth, width: columnMeta.grid['1'].size }}
            >
              <div ref={measureRef} className={mx(segmentTextClasses)} />
            </div>
          </div>
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

export const formatElapsed = (start: Date, end: Date) => {
  const { hours, minutes, seconds } = intervalToDuration({ start, end });
  const pad = (n = 0) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Flatten blocks and measure rows for grid.
 * Implements a fast synchronous estimation phase then a much slower (10x) accurate async measurement phase.
 * @param div - Measuring DIV with the same styles as the grid cells.
 * @param blocks - Transcript blocks.
 * @returns
 */
// TODO(burdon): Only measure rows that have changed. Cache other values.
// TODO(burdon): Build into grid with estimated height and correct on-the-fly.
// TODO(burdon): Instead of measuring twice, use async measurement for actually rendered rows.
const useTranscriptRows = (div: HTMLDivElement | null, blocks?: TranscriptBlock[]): TranscriptRow[] => {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  useEffect(() => {
    if (div) {
      void mapBlocks(div, blocks, true).then((items) => {
        setRows(items);
      });
    }
  }, [div, blocks]);

  return rows;
};

const mapBlocks = async (
  div: HTMLDivElement,
  blocks: TranscriptBlock[] = [],
  estimate = false,
): Promise<TranscriptRow[]> => {
  const ts = Date.now();
  await document.fonts.ready;

  const rows: TranscriptRow[] = [];
  for (const block of blocks) {
    const { author, segments } = block;
    rows.push({ blockId: block.id, size: lineHeight + cellSpacing, author });
    for (const segment of segments) {
      const { started: end, text: raw } = segment;
      const text = raw.trim();
      const height = await measureSegment(div, text, estimate);
      rows.push({ blockId: block.id, size: height + cellSpacing, ts: new Date(end), text });
    }
  }

  log.info('mapBlocks', { n: blocks.length, duration: Date.now() - ts });
  return rows;
};

const updateBlocks = async (div: HTMLDivElement, rows: TranscriptRow[], range: DxGridPlaneRange): Promise<boolean> => {
  let mod = false;
  if (!rows.length) {
    return mod;
  }

  const {
    start: { row: a },
    end: { row: b },
  } = range;
  for (let i = a; i <= b; i++) {
    const { text, size } = rows[i];
    if (text) {
      const height = await measureSegment(div, text);
      if (size !== height + cellSpacing) {
        log.info('update', { i, previous: size, next: height + cellSpacing });
        rows[i].size = height + cellSpacing;
        mod = true;
      }
    }
  }

  return mod;
};

const measureSegment = async (div: HTMLDivElement, text: string, estimate = false): Promise<number> => {
  return new Promise((resolve) => {
    div.innerHTML = text;
    if (estimate) {
      void div.offsetHeight;
      const { height } = div.getBoundingClientRect();
      resolve(height);
    } else {
      requestAnimationFrame(() => {
        const { height } = div.getBoundingClientRect();
        resolve(height);
      });
    }
  });
};
