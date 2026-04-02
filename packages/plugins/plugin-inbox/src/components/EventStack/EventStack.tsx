//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Event } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { ActorList } from '../Actor';
import { DateComponent } from '../DateComponent';

//
// EventTile
//

export type EventStackAction = { type: 'current'; eventId: string };

export type EventStackActionHandler = (action: EventStackAction) => void;

type EventTileData = {
  event: Event.Event;
  onAction?: EventStackActionHandler;
};

type EventTileProps = Pick<MosaicTileProps<EventTileData>, 'location' | 'data'> & { current?: boolean };

const EventTile = forwardRef<HTMLDivElement, EventTileProps>(({ data, location, current }, forwardedRef) => {
  const { event } = data;
  const { setCurrentId } = useMosaicContainer('EventTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(event.id);
  }, [event.id, setCurrentId]);

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={event.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          <Card.Content>
            <Card.Row>
              <Card.Text>{event.title}</Card.Text>
            </Card.Row>
            <Card.Row icon='ph--calendar--regular'>
              <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
            </Card.Row>
            {event.attendees && event.attendees.length > 0 && (
              <Card.Row>
                <ActorList actors={event.attendees} />
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

EventTile.displayName = 'EventTile';

//
// EventStack
//

export type EventStackProps = {
  id: string;
  events?: Event.Event[];
  currentId?: string;
  onAction?: EventStackActionHandler;
};

export const EventStack = composable<HTMLDivElement, EventStackProps>(
  ({ events = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => events.map((event) => ({ event, onAction })), [events, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', eventId: id });
        }
      },
      [onAction],
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
          autoScroll={viewport}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
        >
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={EventTile}
                classNames='my-2'
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.event.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

EventStack.displayName = 'EventStack';
