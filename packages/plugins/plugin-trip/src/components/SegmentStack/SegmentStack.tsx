//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { ScrollArea, ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic } from '@dxos/react-ui-mosaic';

import { Segment } from '#types';

import { SegmentTile, type SegmentCardActionHandler } from '../SegmentCard/SegmentCard';

export type SegmentStackProps = ThemedClassName<{
  id: string;
  segments?: Segment.Segment[];
  currentId?: string;
  selectedIds?: ReadonlySet<string>;
  onAction?: SegmentCardActionHandler;
}>;

const ROW_ESTIMATE = 120;

export const SegmentStack = composable<HTMLDivElement, SegmentStackProps>(
  ({ segments = [], currentId, selectedIds, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    // Sort by primary (start) date ascending; segments without a date go last, stable by original order.
    const sortedSegments = useMemo(() => {
      const withIndex = segments.map((segment, index) => ({
        segment,
        index,
        time: Segment.getPrimaryDate(segment)?.getTime() ?? Number.POSITIVE_INFINITY,
      }));
      withIndex.sort((a, b) => a.time - b.time || a.index - b.index);
      return withIndex.map(({ segment }) => segment);
    }, [segments]);
    const items = useMemo(() => sortedSegments.map((segment) => ({ segment, onAction })), [sortedSegments, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', segmentId: id });
        }
      },
      [onAction],
    );

    const handleSelectionChange = useCallback(
      (id: string) => {
        const isSelected = selectedIds?.has(id) ?? false;
        onAction?.({ type: isSelected ? 'deselect' : 'select', segmentId: id });
      },
      [onAction, selectedIds],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <ScrollArea.Root classNames='py-form-gap' orientation='vertical' padding centered thin>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SegmentTile}
                items={items}
                draggable={false}
                getId={(item) => item.segment.id}
                getScrollElement={() => viewport}
                estimateSize={() => ROW_ESTIMATE}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

SegmentStack.displayName = 'SegmentStack';
