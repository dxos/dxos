//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type MouseEvent, forwardRef, useCallback } from 'react';

import { Card, IconButton } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Segment } from '#types';

export type SegmentCardAction = { segmentId: string } & (
  | {
      type: 'current';
    }
  | {
      type: 'select';
    }
  | {
      type: 'delete';
    }
);

export type SegmentCardActionHandler = (action: SegmentCardAction) => void;

type SegmentTileData = {
  segment: Segment.Segment;
  onAction?: SegmentCardActionHandler;
};

type SegmentTileProps = Pick<MosaicTileProps<SegmentTileData>, 'data' | 'location' | 'current'>;

export const SegmentTile = forwardRef<HTMLDivElement, SegmentTileProps>(({ data, location, current }, forwardedRef) => {
  const { segment, onAction } = data;
  const { setCurrentId, setSelected } = useMosaicContainer('SegmentTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(segment.id);
    setSelected(segment.id, true);
  }, [segment.id, setCurrentId, setSelected]);

  const handleDelete = useCallback(
    (ev: MouseEvent<HTMLButtonElement>) => {
      // Don't let the delete button propagate as a select / current change.
      ev.stopPropagation();
      onAction?.({ type: 'delete', segmentId: segment.id });
    },
    [onAction, segment.id],
  );

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const date = Segment.getPrimaryDate(segment);
  const icon = Segment.kindIcon(segment.kind);
  const isCancelled = segment.status === 'cancelled';

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected border-b border-subdued-separator'
      id={segment.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root
          fullWidth
          border={false}
          ref={forwardedRef}
          classNames={['group relative', isCancelled ? 'opacity-40' : '']}
        >
          <Card.Content>
            <Card.Row icon={icon}>
              <Card.Text classNames={isCancelled ? 'line-through' : undefined}>{title}</Card.Text>
            </Card.Row>
            {route && (
              <Card.Row icon='ph--arrow-right--regular'>
                <span className='text-description text-sm'>{route}</span>
              </Card.Row>
            )}
            {date && (
              <Card.Row icon='ph--calendar--regular'>
                <span className='text-description text-sm'>{format(date, 'PPp')}</span>
              </Card.Row>
            )}
          </Card.Content>
          <IconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label='Delete segment'
            classNames='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity'
            onClick={handleDelete}
          />
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SegmentTile.displayName = 'SegmentTile';
