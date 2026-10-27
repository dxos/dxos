//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, type Ref, forwardRef, useCallback, useMemo, useState } from 'react';

import { CardTile } from '@dxos/react-ui-card';
import { Mosaic, type MosaicScrollController, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';
import { type Event } from '@dxos/types';

import { InboxNamespace } from '../../namespace.ts';
import { EventDetails } from '../Event/index.ts';

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

export const EventStack = Util.composable<HTMLDivElement, EventStackProps>(
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

    // Click / Enter select the event, as they make it current.
    const itemProps = useCallback(
      (id: string) => ({
        'aria-selected': selectedIds ? selectedIds.has(id) : undefined,
        'onActivate': () => onAction?.({ type: 'select', eventId: id }),
      }),
      [selectedIds, onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...Util.composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          controllerRef={controllerRef}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
          itemProps={itemProps}
        >
          <ScrollArea.Root width='regular'>
            <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={EventTile}
                items={items}
                draggable={false}
                getId={(item) => item.event.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
                gap={8}
                inset={false}
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

type EventTileProps = Pick<MosaicTileProps<EventTileData>, 'data' | 'location' | 'current' | 'binding'>;

const EventTile = forwardRef<HTMLDivElement, EventTileProps>(({ data, location, current, binding }, forwardedRef) => {
  const { event, starred, onAction } = data;
  const { t } = Hooks.useTranslation(InboxNamespace.key);
  const { setCurrentId } = useMosaicContainer('EventTile');

  // Click / Enter commit current; the container's `itemProps` selects. Arrow keys only move focus.
  const handleCurrentChange = useCallback(() => {
    setCurrentId(event.id);
  }, [event.id, setCurrentId]);

  const handleToggleStar = useCallback(() => onAction?.({ type: 'star', eventId: event.id }), [onAction, event.id]);

  return (
    <CardTile.Root
      ref={forwardedRef}
      id={event.id}
      data={data}
      location={location}
      current={current}
      binding={binding}
      onCurrentChange={handleCurrentChange}
    >
      <CardTile.Header
        starred={starred}
        onToggleStar={onAction ? handleToggleStar : undefined}
        title={<span className='grow truncate font-medium'>{event.title ?? t('event-untitled.label')}</span>}
      />
      <Card.Body>
        <EventDetails event={event} title={false} description maxAttendees={3} />
      </Card.Body>
    </CardTile.Root>
  );
});

EventTile.displayName = 'EventTile';
