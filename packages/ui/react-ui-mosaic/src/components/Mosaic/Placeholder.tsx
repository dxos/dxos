//
// Copyright 2025 DXOS.org
//

import {
  DropIndicator as NaturalDropIndicator,
  type DropIndicatorProps as NaturalDropIndicatorProps,
} from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
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
  const Comp = asChild ? Slot : Primitive.div;
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

  // Scrolling pauses activation, not registration. Tearing the drop target down mid-drag also
  // erases the pointer's aim: pragmatic drops the element from `location.current.dropTargets`, so a
  // release inside the container's 500ms scroll window resolves to the container and the drop
  // becomes "move to end" instead of landing in the gap under the cursor. That is what destroyed a
  // card in `rearrange within column` on firefox — expanding this placeholder scrolls the viewport,
  // the scroll unregisters every placeholder, and the drop lands nowhere the user aimed.
  const scrollingRef = useRef(scrolling);
  scrollingRef.current = scrolling;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => data,
      canDrop: ({ source }) => {
        const data = getSourceData(source);
        return (data && eventHandler.canDrop?.({ source: data })) || false;
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
    <Comp
      {...{
        [`data-${MOSAIC_PLACEHOLDER_ORIENTATION_ATTR}`]: orientation,
        [`data-${MOSAIC_PLACEHOLDER_STATE_ATTR}`]: data.location === activeLocation ? 'active' : 'idle',
        [`data-${MOSAIC_PLACEHOLDER_LOCATION_ATTR}`]: String(location),
      }}
      className={mx('relative', classNames)}
      ref={rootRef}
    >
      {children}
    </Comp>
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
