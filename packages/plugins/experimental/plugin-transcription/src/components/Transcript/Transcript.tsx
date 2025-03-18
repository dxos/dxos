//
// Copyright 2023 DXOS.org
//

import React, { type FC, useCallback, useEffect, useMemo, useState, type WheelEvent } from 'react';

import { useAttention } from '@dxos/react-ui-attention';
import {
  type DxGridCellValue,
  type DxGridElement,
  type DxGridPlaneCells,
  Grid,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): react-ui-list.
// TODO(burdon): Actions (e.g., mark, summarize, translate, label, delete).

export type TranscriptProps = {
  blocks?: TranscriptBlock[];
  attendableId: string;
  ignoreAttention?: boolean;
};

const transcriptColumns = {
  grid: { size: 600 },
};

const transcriptRows = {
  grid: { size: 100 },
};

type QueueRows = [number, number][];

const mapTranscriptQueue = (blocks?: TranscriptBlock[]): QueueRows => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return [];
  } else {
    return blocks.flatMap((block, blockIndex) => {
      return [
        [blockIndex, -1],
        ...block.segments.map((_, segmentIndex) => {
          return [blockIndex, segmentIndex] as [number, number];
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
                    }
                  : {
                      value: blocks[blockIndex]!.segments[segmentIndex]!.text,
                      readonly: true,
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
        onWheel={handleWheel}
        className='[--dx-grid-base:var(--surface-bg)]'
        limitColumns={1}
        limitRows={queueMap.length}
        ref={setDxGrid}
      />
      {/* {blocks?.map((block) => ( */}
      {/*  <div */}
      {/*    role='listitem' */}
      {/*    key={block.id} */}
      {/*    className='flex flex-col py-1 border border-transparent hover:border-separator rounded' */}
      {/*  > */}
      {/*    <div className='group flex items-center px-2'> */}
      {/*      <Icon icon='ph--user--regular' /> */}
      {/*      <div className='px-2 text-sm text-subdued'>{block.author}</div> */}
      {/*      <div className='grow' /> */}
      {/*      <IconButton disabled icon='ph--x--regular' label={t('delete button')} iconOnly size={4} classNames={[]} /> */}
      {/*    </div> */}

      {/*    {block.segments.map((segment, i) => ( */}
      {/*      <div key={i} className='group flex flex-col'> */}
      {/*        <div className='px-2'>{segment.text}</div> */}
      {/*        <div className='flex gap-1 items-center justify-between px-2'> */}
      {/*          <div className='grow' /> */}
      {/*          <div className='truncate text-xs text-subdued'> */}
      {/*            {formatDistanceToNow(segment.started, { addSuffix: true })} */}
      {/*          </div> */}
      {/*          <IconButton */}
      {/*            disabled */}
      {/*            icon='ph--bookmark-simple--regular' */}
      {/*            label={t('bookmark button')} */}
      {/*            iconOnly */}
      {/*            size={4} */}
      {/*            classNames={hoverButton} */}
      {/*          /> */}
      {/*        </div> */}
      {/*      </div> */}
      {/*    ))} */}
      {/*  </div> */}
      {/* ))} */}
    </Grid.Root>
  );
};
