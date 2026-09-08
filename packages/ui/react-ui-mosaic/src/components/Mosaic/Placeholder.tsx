//
// Copyright 2025 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import {
  DropIndicator as NaturalDropIndicator,
  type DropIndicatorProps as NaturalDropIndicatorProps,
} from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useLayoutEffect, useMemo, useRef } from 'react';

import { type Axis, type ThemedClassName } from '@dxos/react-ui';
import { type DndLocation, type DndPlaceholderData, getSourceData } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

import { useMosaicContainerContext } from './MosaicContainerContext';
import { useMosaicTileContext } from './MosaicTileContext';

//
// Placeholder
//

const MOSAIC_PLACEHOLDER_NAME = 'Mosaic.Placeholder';

// Orientation: data-[mosaic-placeholder-orientation=vertical]
const MOSAIC_PLACEHOLDER_ORIENTATION_ATTR = 'mosaic-placeholder-orientation';

// State attribute: data-[mosaic-placeholder-state=active]
const MOSAIC_PLACEHOLDER_STATE_ATTR = 'mosaic-placeholder-state';

// Location attribute: data-[mosaic-placeholder-location=0.5]. Identifies the
// placeholder's slot in its container (0.5, 1.5, 2.5, …) so tests can target
// a specific gap unambiguously without relying on layout-dependent indices.
const MOSAIC_PLACEHOLDER_LOCATION_ATTR = 'mosaic-placeholder-location';

type MosaicPlaceholderProps<Location = DndLocation> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    orientation?: Axis;
    location: Location;
  }>
>;

const MosaicPlaceholder = <Location extends DndLocation = DndLocation>({
  classNames,
  children,
  asChild,
  orientation = 'vertical',
  location,
}: MosaicPlaceholderProps<Location>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    id: containerId,
    eventHandler,
    scrolling,
    activeLocation,
    setActiveLocation,
  } = useMosaicContainerContext(MOSAIC_PLACEHOLDER_NAME);
  const data = useMemo<DndPlaceholderData<Location>>(
    () =>
      ({
        type: 'placeholder',
        containerId,
        location,
      }) satisfies DndPlaceholderData<Location>,
    [containerId, location],
  );

  // Scrolling suspends a placeholder rather than unregistering it: pragmatic drops an unregistered
  // element from `location.current.dropTargets`, so a release inside the container's scroll window
  // resolves to the container and lands at the end instead of in the aimed gap.
  //
  // Suspension is per-placeholder because an idle one is ~8px of collapsed padding, and letting that
  // accept a drop mid-scroll steals a release owed to the container. The aimed placeholder keeps its
  // target because pragmatic evaluates `canDrop` on entry, not per frame.
  const scrollingRef = useRef(scrolling);
  scrollingRef.current = scrolling;
  const activeLocationRef = useRef(activeLocation);
  activeLocationRef.current = activeLocation;
  // `useEventHandlerAdapter` mints a new handler whenever `items` changes, so `canDrop` must read the
  // current one rather than the value captured when the target was registered.
  const eventHandlerRef = useRef(eventHandler);
  eventHandlerRef.current = eventHandler;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => data,
      canDrop: ({ source }) => {
        if (scrollingRef.current && activeLocationRef.current !== data.location) {
          return false;
        }
        const sourceData = getSourceData(source);
        return (sourceData && eventHandlerRef.current.canDrop?.({ source: sourceData })) || false;
      },
      // Reorder is a move, not a copy — otherwise the browser shows the green "+" copy cursor.
      getDropEffect: () => 'move',
      onDragEnter: () => {
        if (!scrollingRef.current) {
          setActiveLocation(data.location);
        }
      },
      onDragLeave: () => {
        if (!scrollingRef.current) {
          setActiveLocation(undefined);
        }
      },
      onDrop: () => {
        setActiveLocation(undefined);
      },
    });
  }, [rootRef, data, setActiveLocation]);

  return (
    <ark.div
      asChild={asChild}
      {...{
        [`data-${MOSAIC_PLACEHOLDER_ORIENTATION_ATTR}`]: orientation,
        [`data-${MOSAIC_PLACEHOLDER_STATE_ATTR}`]: data.location === activeLocation ? 'active' : 'idle',
        [`data-${MOSAIC_PLACEHOLDER_LOCATION_ATTR}`]: String(location),
      }}
      className={mx('relative', classNames)}
      ref={rootRef}
    >
      {children}
    </ark.div>
  );
};

MosaicPlaceholder.displayName = MOSAIC_PLACEHOLDER_NAME;

//
// DropIndicator
// TODO(burdon): Support DropIndicator or Placeholder variants.
//

const DROP_INDICATOR_NAME = 'Mosaic.DropIndicator';

type MosaicDropIndicatorProps = Omit<NaturalDropIndicatorProps, 'edge'>;

const MosaicDropIndicator = (props: MosaicDropIndicatorProps) => {
  const { state } = useMosaicTileContext(DROP_INDICATOR_NAME);
  return state.type === 'target' && state.closestEdge ? (
    <NaturalDropIndicator {...props} edge={state.closestEdge} />
  ) : null;
};

MosaicDropIndicator.displayName = DROP_INDICATOR_NAME;

//
// Exports
//

export { MosaicDropIndicator, MosaicPlaceholder };

export type { MosaicDropIndicatorProps, MosaicPlaceholderProps };
