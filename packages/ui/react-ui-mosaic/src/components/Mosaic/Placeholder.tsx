//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  DropIndicator as NativeDropIndicator,
  type DropIndicatorProps as NativeDropIndicatorProps,
} from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, useLayoutEffect, useMemo, useRef } from 'react';

import { type Axis, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useMosaicContainerContext } from './Container';
import { useMosaicTileContext } from './Tile';
import { type LocationType, type MosaicPlaceholderData, getSourceData } from './types';

//
// Placeholder
//

const MOSAIC_PLACEHOLDER_NAME = 'Mosaic.Placeholder';

// Orientation: data-[mosaic-placeholder-orientation=vertical]
const MOSAIC_PLACEHOLDER_ORIENTATION_ATTR = 'mosaic-placeholder-orientation';

// State attribute: data-[mosaic-placeholder-state=active]
const MOSAIC_PLACEHOLDER_STATE_ATTR = 'mosaic-placeholder-state';

type MosaicPlaceholderProps<Location = LocationType> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    orientation?: Axis;
    location: Location;
  }>
>;

const MosaicPlaceholder = <Location extends LocationType = LocationType>({
  classNames,
  children,
  asChild,
  orientation = 'vertical',
  location,
}: MosaicPlaceholderProps<Location>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const Root = asChild ? Slot : Primitive.div;
  const {
    id: containerId,
    eventHandler,
    scrolling,
    activeLocation,
    setActiveLocation,
  } = useMosaicContainerContext(MOSAIC_PLACEHOLDER_NAME);
  const data = useMemo<MosaicPlaceholderData<Location>>(
    () =>
      ({
        type: 'placeholder',
        containerId,
        location,
      }) satisfies MosaicPlaceholderData<Location>,
    [containerId, location],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || scrolling) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => data,
      canDrop: ({ source }) => {
        const data = getSourceData(source);
        return (data && eventHandler.canDrop?.({ source: data })) || false;
      },
      onDragEnter: () => {
        setActiveLocation(data.location);
      },
      onDragLeave: () => {
        setActiveLocation(undefined);
      },
      onDrop: () => {
        setActiveLocation(undefined);
      },
    });
  }, [rootRef, data, scrolling, setActiveLocation]);

  return (
    <Root
      {...{
        [`data-${MOSAIC_PLACEHOLDER_ORIENTATION_ATTR}`]: orientation,
        [`data-${MOSAIC_PLACEHOLDER_STATE_ATTR}`]: data.location === activeLocation ? 'active' : 'idle',
      }}
      role='none'
      className={mx('relative', classNames)}
      ref={rootRef}
    >
      {children}
    </Root>
  );
};

MosaicPlaceholder.displayName = MOSAIC_PLACEHOLDER_NAME;

//
// DropIndicator
// TODO(burdon): Support DropIndicator or Placeholder variants.
//

const DROP_INDICATOR_NAME = 'Mosaic.DropIndicator';

type MosaicDropIndicatorProps = Omit<NativeDropIndicatorProps, 'edge'>;

const MosaicDropIndicator = (props: MosaicDropIndicatorProps) => {
  const { state } = useMosaicTileContext(DROP_INDICATOR_NAME);
  return state.type === 'target' && state.closestEdge ? (
    <NativeDropIndicator {...props} edge={state.closestEdge} />
  ) : null;
};

MosaicDropIndicator.displayName = DROP_INDICATOR_NAME;

//
// Exports
//

export { MosaicPlaceholder, MosaicDropIndicator };

export type { MosaicPlaceholderProps, MosaicDropIndicatorProps };
