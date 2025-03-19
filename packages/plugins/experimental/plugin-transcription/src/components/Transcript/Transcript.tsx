//
// Copyright 2023 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type FC, useCallback, useEffect, useMemo, useState, type WheelEvent } from 'react';

import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridCellValue,
  type DxGridElement,
  type DxGridAxisMeta,
  type DxGridPlaneCells,
  Grid,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

const lineHeight = 24;
const columnWidth = 600;
const cellSpacing = 12;
// TODO(thure): This value was tuned using greeking in Storybook; tune further based on natural language, or refactor to compute the actual size of wrapped text.
const monoCharacterWidthWithWrapBuffer = 10 * 1.03;

export type TranscriptProps = {
  blocks?: TranscriptBlock[];
  attendableId: string;
  ignoreAttention?: boolean;
};

const transcriptColumns = {
  grid: { size: columnWidth },
};

const transcriptRows = {
  grid: { size: lineHeight },
};

const authorClasses = 'pli-2 place-content-end text-[16px] leading-[24px]';
const segmentTextClasses = 'pli-1 font-mono whitespace-normal hyphens-auto text-[16px] leading-[24px]';

type QueueRows = [number, number, number][];

const mapTranscriptQueue = (blocks?: TranscriptBlock[]): QueueRows => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return [];
  } else {
    return blocks.flatMap((block, blockIndex) => {
      return [
        [blockIndex, -1, lineHeight + cellSpacing],
        ...block.segments.map((segment, segmentIndex) => {
          return [
            blockIndex,
            segmentIndex,
            cellSpacing +
              lineHeight * (Math.ceil((segment.text.length * monoCharacterWidthWithWrapBuffer) / columnWidth) + 1),
          ] as [number, number, number];
        }),
      ];
    });
  }
};

export const Transcript: FC<TranscriptProps> = ({ blocks, attendableId, ignoreAttention }) => {
  const { hasAttention } = useAttention(attendableId);
  const [dxGrid, setDxGrid] = useState<DxGridElement | null>(null);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!ignoreAttention && !hasAttention) {
        event.stopPropagation();
      }
    },
    [hasAttention, ignoreAttention],
  );

  const queueMap = useMemo(() => mapTranscriptQueue(blocks), [blocks]);

  const rows = useMemo(
    () =>
      ({
        grid: queueMap.reduce((acc: DxGridAxisMeta['grid'], row, rowIndex) => {
          acc[rowIndex] = { size: row[2] };
          return acc;
        }, {}),
      }) satisfies DxGridAxisMeta,
    [queueMap],
  );

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
                      value: blocks[blockIndex]!.author,
                      readonly: true,
                      className: authorClasses,
                    }
                  : {
                      readonly: true,
                      accessoryHtml: `<span class="dx-tag" data-hue="neutral">${formatDistanceToNow(blocks[blockIndex]!.segments[segmentIndex]!.started, { addSuffix: true })}</span><p class="${segmentTextClasses}">${blocks[blockIndex]!.segments[segmentIndex]!.text}</p>`,
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
    <Grid.Root id={`${attendableId}--transcript`}>
      <Grid.Content
        columnDefault={transcriptColumns}
        rowDefault={transcriptRows}
        rows={rows}
        onWheel={handleWheel}
        className='[--dx-grid-base:var(--dx-baseSurface)] [--dx-grid-lines:var(--dx-baseSurface)] [&_.dx-grid]:min-bs-0 [&_.dx-grid]:select-auto'
        limitColumns={1}
        limitRows={queueMap.length}
        ref={setDxGrid}
      />
    </Grid.Root>
  );
};
