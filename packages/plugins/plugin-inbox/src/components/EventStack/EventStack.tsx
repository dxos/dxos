//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, type Ref, forwardRef, useCallback, useMemo, useState } from 'react';

import { Card, ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { CardTile } from '@dxos/react-ui-card';
import {
  Focus,
  Mosaic,
  type MosaicScrollController,
  type MosaicTileProps,
  useMosaicContainer,
} from '@dxos/react-ui-mosaic';
import { type Event } from '@dxos/types';

import { meta } from '#meta';

import { EventDetails } from '../Event';

export type EventStackAction =
  | { type: 'current'; eventId: string }
  | { type: 'select'; eventId: string }
  | { type: 'star'; eventId: string };

export type EventStackActionHandler = (action: EventStackAction) => void;

//
// EventStack
//

export type EventStackProps = {
  id: string;
  events?: Event.Event[];
  currentId?: string;
  /** IDs of selected events (forwarded to Mosaic so `aria-selected` fires `dx-selected`). */
  selectedIds?: ReadonlySet<string>;
  /** IDs of starred events; drives the per-tile star toggle. */
  starredIds?: ReadonlySet<string>;
  /** Imperative handle to scroll the stack to an event without changing the current item. */
  controllerRef?: Ref<MosaicScrollController>;
  onAction?: EventStackActionHandler;
};

export const EventStack = composable<HTMLDivElement, EventStackProps>(
  ({ events = [], currentId, selectedIds, starredIds, controllerRef, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(
      () => events.map((event) => ({ event, starred: starredIds?.has(event.id), onAction })),
      [events, starredIds, onAction],
    );

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', eventId: id });
        }
      },
      [onAction],
    );

    const handleSelectionChange = useCallback(
      (id: string, _selected: boolean) => {
        onAction?.({ type: 'select', eventId: id });
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
          controllerRef={controllerRef}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <ScrollArea.Root padding centered>
            <ScrollArea.Viewport classNames='py-2' ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={EventTile}
                items={items}
                draggable={false}
                getId={(item) => item.event.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
                gap={4}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

EventStack.displayName = 'EventStack';

//
// EventTile
//

type EventTileData = {
  event: Event.Event;
  starred?: boolean;
  onAction?: EventStackActionHandler;
};

type EventTileProps = Pick<MosaicTileProps<EventTileData>, 'data' | 'location' | 'current'>;

const EventTile = forwardRef<HTMLDivElement, EventTileProps>(({ data, location, current }, forwardedRef) => {
  const { event, starred, onAction } = data;
  const { t } = useTranslation(meta.profile.key);
  const { setCurrentId, setSelected } = useMosaicContainer('EventTile');

  // Click / Enter commit both current and selection. Arrow keys only move focus.
  const handleCurrentChange = useCallback(() => {
    setCurrentId(event.id);
    setSelected(event.id, true);
  }, [event.id, setCurrentId, setSelected]);

  const handleToggleStar = useCallback(() => onAction?.({ type: 'star', eventId: event.id }), [onAction, event.id]);

  return (
    <CardTile.Root
      ref={forwardedRef}
      id={event.id}
      data={data}
      location={location}
      current={current}
      onCurrentChange={handleCurrentChange}
    >
      <CardTile.Header
        starred={starred}
        onToggleStar={onAction ? handleToggleStar : undefined}
        title={<span className='grow truncate font-medium'>{event.title ?? t('event-untitled.label')}</span>}
      />
      <Card.Body>
        <EventDetails event={event} title={false} maxAttendees={8} />
      </Card.Body>
    </CardTile.Root>
  );
});

EventTile.displayName = 'EventTile';
