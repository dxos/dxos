//
// Copyright 2023 DXOS.org
//

import { intervalToDuration } from 'date-fns/intervalToDuration';
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
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
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

const timeWidth = 70;
const lineHeight = 24;
const cellSpacing = 12;

const authorClasses = 'text-[16px] leading-[24px] dx-tag';
const segmentTextClasses = 'text-[16px] leading-[24px] whitespace-pre-wrap break-words hyphens-none';

type QueueRows = [number, number, number][];

export type TranscriptProps = {
  attendableId?: string;
  ignoreAttention?: boolean;
  blocks?: TranscriptBlock[];
};

export const Transcript: FC<TranscriptProps> = ({ attendableId, ignoreAttention, blocks }) => {
  const { hasAttention } = useAttention(attendableId);
  const { ref, width } = useResizeDetector();
  const measureRef = useRef<HTMLDivElement>(null);

  const textWidth = width ? width - timeWidth : 0;
  const transcriptColumns = width
    ? {
        grid: {
          0: { size: timeWidth },
          1: { size: textWidth },
        },
      }
    : undefined;

  const transcriptRows = {
    grid: { size: lineHeight },
  };

  const items = useItems(measureRef.current, blocks);
  const rows = useMemo(
    () =>
      ({
        grid: items.reduce((acc: DxGridAxisMeta['grid'], row, rowIndex) => {
          acc[rowIndex] = { size: row[2] };
          return acc;
        }, {}),
      }) satisfies DxGridAxisMeta,
    [items],
  );

  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  useEffect(() => {
    if (dxGrid && Array.isArray(blocks)) {
      const start = blocks[0]?.segments[0]?.started ?? 0;

      dxGrid.getCells = (range, plane) => {
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < items.length; row++) {
              const [blockIndex, segmentIndex] = items[row];
              const { author, segments } = blocks[blockIndex] ?? { author: '', segments: [] };
              const { started: end, text } = segments[segmentIndex] ?? { started: 0, text: '' };

              cells[toPlaneCellIndex({ col: 0, row })] = (
                segmentIndex === 0
                  ? {
                      readonly: true,
                      accessoryHtml: `<span class="pbs-1 text-xs text-neutral-500">${formatElapsed(start, end)}</span>`,
                    }
                  : {}
              ) satisfies DxGridCellValue;

              cells[toPlaneCellIndex({ col: 1, row })] = (
                segmentIndex < 0
                  ? {
                      value: author,
                      readonly: true,
                      // TODO(burdon): Color based on username.
                      className: authorClasses,
                    }
                  : {
                      readonly: true,
                      accessoryHtml: `<div class="${segmentTextClasses}">${text.trim()}</div>`,
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
  }, [dxGrid, items, blocks]);

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
      {transcriptColumns && (
        <>
          <div className='relative'>
            <div
              className='absolute top-0 z-10 p-1 border invisible'
              style={{ left: timeWidth, width: transcriptColumns.grid['1'].size }}
            >
              <div ref={measureRef} className={mx(segmentTextClasses)} />
            </div>
          </div>
          <Grid.Root id={`${attendableId}--transcript`}>
            <Grid.Content
              ref={setDxGrid}
              className='[--dx-grid-base:var(--dx-baseSurface)] [--dx-grid-lines:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:select-auto'
              columns={transcriptColumns}
              rowDefault={transcriptRows}
              rows={rows}
              limitColumns={2}
              limitRows={items.length}
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
 * Measure rows for grid.
 * @param div - Measuring DIV with the same styles as the grid cells.
 * @param blocks - Transcript blocks.
 * @returns
 */
const useItems = (div: HTMLDivElement | null, blocks?: TranscriptBlock[]) => {
  const [items, setItems] = useState<QueueRows>([]);
  useEffect(() => {
    if (div) {
      // TODO(burdon): Only measure rows that have changed. Cache other values.
      // TODO(burdon): Build into grid with estimated height and correct on the fly.
      void mapBlocks(div, blocks, true).then((items) => {
        setItems(items);
        if (div) {
          void mapBlocks(div, blocks, false).then(setItems);
        }
      });
    }
  }, [div, blocks]);

  return items;
};

const mapBlocks = async (div: HTMLDivElement, blocks?: TranscriptBlock[], estimate = false): Promise<QueueRows> => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return [];
  } else {
    const ts = Date.now();
    await document.fonts.ready;

    const rows: QueueRows = [];
    let blockIndex = 0;
    for (const block of blocks) {
      rows.push([blockIndex, -1, lineHeight + cellSpacing]);
      let segmentIndex = 0;
      for (const segment of block.segments) {
        const height = await measureSegment(div, segment.text, estimate);
        rows.push([blockIndex, segmentIndex, height + cellSpacing]);
        segmentIndex++;
      }
      blockIndex++;
    }

    log('render', { duration: Date.now() - ts });
    return rows;

    // return blocks.flatMap((block, blockIndex) => {
    //   return [
    //     [blockIndex, -1, lineHeight + cellSpacing],
    //     ...block.segments.map((segment, segmentIndex) => {
    //       div.innerHTML = segment.text;
    //       const height = measureSegmentSync(div, segment.text) + cellSpacing;
    //       return [blockIndex, segmentIndex, height] as [number, number, number];
    //     }),
    //   ];
    // });
  }
};

// TODO(burdon): Occasional random measurement error (-1 actual lines).
// const measureSegmentSync = (div: HTMLDivElement, text: string): number => {
//   div.innerHTML = text;
//   void div.offsetHeight;
//   return div.offsetHeight;
// };

const measureSegment = async (div: HTMLDivElement, text: string, estimate = false): Promise<number> => {
  return new Promise((resolve) => {
    div.innerHTML = text;
    if (estimate) {
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
