//
// Copyright 2023 DXOS.org
//

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

const lineHeight = 24;
const initialColumnWidth = 600;
const cellSpacing = 8 + 2;

export type TranscriptProps = {
  blocks?: TranscriptBlock[];
  attendableId: string;
  ignoreAttention?: boolean;
};

const transcriptInitialColumns = {
  grid: { size: initialColumnWidth },
};

const transcriptInitialRows = {
  grid: { size: lineHeight + cellSpacing },
};

const authorClasses = 'font-medium text-base leading-[24px]';
const timestampClasses = 'mis-2 text-xs text-description leading-[24px]';
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
    refreshMode: 'debounce',
    refreshRate: 200,
  });

  useEffect(() => {
    const host = measureRef.current;
    if (width && host && blocks && queueMap) {
      setRows({
        grid: queueMap
          .map(([blockIndex, segmentIndex]) => {
            if (segmentIndex < 0) {
              return lineHeight + cellSpacing;
            } else {
              measureRef.current.textContent = blocks[blockIndex]!.segments[segmentIndex]!.text;
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
                      accessoryHtml: `<span class="${authorClasses}">${blocks[blockIndex]!.author}</span><span class="${timestampClasses}">${blocks[0]?.segments[0]?.started}</span>`,
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
