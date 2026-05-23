//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { forwardRef, useCallback } from 'react';

import { Card } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Segment } from '#types';

export type SegmentCardAction = { segmentId: string } & (
  | {
      type: 'current';
    }
  | {
      type: 'select';
    }
);

export type SegmentCardActionHandler = (action: SegmentCardAction) => void;

type SegmentTileData = {
  segment: Segment.Any;
  onAction?: SegmentCardActionHandler;
};

type SegmentTileProps = Pick<MosaicTileProps<SegmentTileData>, 'data' | 'location' | 'current'>;

export const SegmentTile = forwardRef<HTMLDivElement, SegmentTileProps>(({ data, location, current }, forwardedRef) => {
  const { segment } = data;
  const { setCurrentId, setSelected } = useMosaicContainer('SegmentTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(segment.id);
    setSelected(segment.id, true);
  }, [segment.id, setCurrentId, setSelected]);

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const date = Segment.getPrimaryDate(segment);
  const icon = Segment.kindIcon(segment._tag);
  const isCancelled = segment.status === 'cancelled';
  const isTentative = segment.status === 'tentative' || segment.status === 'proposed';

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected border-b border-subdued-separator'
      id={segment.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} ref={forwardedRef} classNames={isCancelled ? 'opacity-40' : undefined}>
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
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SegmentTile.displayName = 'SegmentTile';
