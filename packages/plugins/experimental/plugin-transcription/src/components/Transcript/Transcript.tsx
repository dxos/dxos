//
// Copyright 2023 DXOS.org
//

import { intervalToDuration } from 'date-fns/intervalToDuration';
import React, { type FC, useCallback, useEffect, useMemo, useState, type WheelEvent } from 'react';
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

const lineHeight = 20;
const initialColumnWidth = 600;
const cellSpacing = 8 + 2;

export type TranscriptProps = {
  blocks?: TranscriptBlock[];
  attendableId?: string;
  ignoreAttention?: boolean;
};

const transcriptInitialColumns = {
  grid: { size: initialColumnWidth },
};

const transcriptInitialRows = {
  grid: { size: lineHeight + cellSpacing },
};

const authorClasses = 'font-medium text-base leading-[20px]';
const timestampClasses = 'mie-1 text-xs text-description leading-[20px]';
const segmentTextClasses = 'text-sm whitespace-normal hyphens-auto';
const measureClasses = mx(
  'absolute inset-inline-0 invisible z-[-1] border pli-[--dx-grid-cell-padding-inline] plb-[--dx-grid-cell-padding-block]',
  segmentTextClasses,
);

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

const renderCell = (transcriptStart: Date, segmentStart: Date, segmentText: string) =>
  `<span class="${timestampClasses}">${formatTimestamp(
    transcriptStart,
    segmentStart,
  )}</span><span class="${segmentTextClasses}">${segmentText}</span>`;

export const Transcript: FC<TranscriptProps> = ({ blocks, attendableId, ignoreAttention }) => {
  const { hasAttention } = useAttention(attendableId);
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);
  const [rows, setRows] = useState<DxGridAxisMeta | undefined>(undefined);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const queueMap = useMemo(() => mapTranscriptQueue(blocks), [blocks]);

  const { width, ref: measureRef } = useResizeDetector({
    // TODO(thure): Ideally this should kick off a remeasurement of `rows`, abort the remeasurement if width changes
    //  before it’s complete, and remeasure as often as it’s able otherwise. Maybe a use-case
    //  for `main-thread-scheduling`.
    refreshOptions: { leading: true },
    refreshMode: 'throttle',
    refreshRate: 200,
  });

  useEffect(() => {
    const host = measureRef.current;
    if (width && host && blocks && queueMap) {
      const transcriptStart = blocks[0]!.segments[0]!.started;
      setRows({
        grid: queueMap
          .map(([blockIndex, segmentIndex]) => {
            if (segmentIndex < 0) {
              return lineHeight + cellSpacing;
            } else {
              measureRef.current.innerHTML = renderCell(
                transcriptStart,
                blocks[blockIndex]!.segments[segmentIndex]!.started,
                blocks[blockIndex]!.segments[segmentIndex]!.text,
              );
              return measureRef.current.offsetHeight;
            }
          })
          .reduce((acc: DxGridAxisMeta['grid'], size, row) => {
            acc[row] = { size };
            return acc;
          }, {}),
      });
    } else {
      setRows(undefined);
    }
  }, [queueMap, blocks, width]);

  const columns = useMemo(() => {
    if (width) {
      return { grid: { size: width } };
    } else {
      return transcriptInitialColumns;
    }
  }, [width]);

  useEffect(() => {
    if (dxGrid && Array.isArray(blocks)) {
      const transcriptStart = blocks[0]!.segments[0]!.started;
      dxGrid.getCells = (range, plane) => {
        switch (plane) {
          case 'grid': {
            const cells: DxGridPlaneCells = {};
            for (let row = range.start.row; row <= range.end.row && row < queueMap.length; row++) {
              const [blockIndex, segmentIndex] = queueMap[row];
              cells[toPlaneCellIndex({ col: 0, row })] = (
                segmentIndex < 0
                  ? {
                      readonly: true,
                      value: blocks[blockIndex]!.author,
                      className: authorClasses,
                    }
                  : {
                      readonly: true,
                      accessoryHtml: renderCell(
                        transcriptStart,
                        blocks[blockIndex]!.segments[segmentIndex]!.started,
                        blocks[blockIndex]!.segments[segmentIndex]!.text,
                      ),
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

  return (
    <>
      <Grid.Root id={`${attendableId}--transcript`}>
        <Grid.Content
          columnDefault={columns}
          rowDefault={transcriptInitialRows}
          rows={rows}
          onWheel={handleWheel}
          className='[--dx-grid-base:var(--dx-baseSurface)] [--dx-grid-lines:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:min-is-0 [&_.dx-grid]:select-auto'
          limitColumns={1}
          limitRows={queueMap.length}
          ref={setDxGrid}
        />
      </Grid.Root>
      <div role='none' {...{ inert: '' }} aria-hidden className={measureClasses} ref={measureRef} />
    </>
  );
};
