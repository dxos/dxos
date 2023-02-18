//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, pointerWithin, useSensor } from '@dnd-kit/core';
import React, { FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { Dimensions, Layout, Item, Point, Location, serializeLocation, parseLocation } from '../layout';
import { Cell } from './Cell';
import { Tile, TileContentProps, TileClasses } from './Tile';

export type GridClasses = {
  tile?: TileClasses;
};

export type GridProps<T extends {} = {}> = {
  layout: Layout;
  items?: Item<T>[];
  classes?: GridClasses;
  Content?: FC<TileContentProps<T>>;
  onSelect?: (item: Item<T>) => void;
  onChange?: (item: Item<T>, location: Location) => void;
  onCreate?: (location: Location) => Promise<string | undefined>;
  onDelete?: (item: Item<T>) => void;
};

const options = {
  transitionDelay: 500,
  zoomOut: 0.55,
  zoomIn: 2
};

// TODO(burdon): Pass in selected (and store in app state).
export const Grid = <T extends {} = {}>({
  items = [],
  layout,
  classes = {},
  Content,
  onSelect,
  onChange,
  onCreate,
  onDelete
}: GridProps<T>) => {
  const getItem = (location: Location): Item<T> | undefined => {
    return items.find((item) => item.location && serializeLocation(item.location) === serializeLocation(location));
  };

  // Container allows any selected item to scroll near to the center.
  const containerDimensions: Dimensions = {
    width: layout.dimensions.width * 1.5,
    height: layout.dimensions.height * 1.5
  };

  /**
   * Calculate offset of the container relative to the screen of the given point.
   * The point is relative to the center of the layout.
   */
  const getOffset = (center: Point) => {
    if (!width || !height) {
      return { x: 0, y: 0 };
    }

    return {
      x: center.x - Math.round((width - containerDimensions.width) / 2),
      y: center.y - Math.round((height - containerDimensions.height) / 2)
    };
  };

  const { ref: containerRef, width, height } = useResizeDetector();
  const [, forceUpdate] = useState({});

  //
  // Pan (scroll) and zoom.
  //

  // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
  const [containerStyles, setContainerStyles] = useState<any>({
    transition: `${options.transitionDelay}ms ease-in-out`,
    transform: 'scale(1)'
  });

  const [zoom, setZoom] = useState<number>(1);
  useEffect(() => {
    if (zoom !== 1) {
      scrollTo();
    }

    setContainerStyles((style: any) => ({
      ...style,
      transform: `scale(${zoom})`
    }));
  }, [zoom]);

  /**
   * Scroll to center point. Assumes scale is 1.
   */
  const scrollTo = (center: Point = { x: 0, y: 0 }, smooth = true) => {
    const offset = getOffset(center);
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo
    containerRef.current.scrollTo({ left: offset.x, top: offset.y, behavior: smooth ? 'smooth' : 'instant' });
  };

  useEffect(() => {
    if (width && height) {
      const item = selected ? items.find((item) => item.id === selected) : undefined;
      scrollTo(layout.getCenter(item?.location ?? { x: 0, y: 0 }), false);
    }
  }, [width, height]);

  //
  // Create and select.
  //

  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    const item = selected ? items.find((item) => item.id === selected) : undefined;
    setZoom(zoom);
    scrollTo(layout.getCenter(item?.location ?? { x: 0, y: 0 }));
  }, [items, selected]);

  const handleCreate = async (point: Point) => {
    if (onCreate) {
      const id = await onCreate(point);
      setSelected(id);
    }
  };

  //
  // DND
  //

  const mouseSensor = useSensor(MouseSensor, {
    // TODO(burdon): Factor out.
    activationConstraint: {
      distance: 10 // Move 10px before activating.
    }
  });

  // TODO(burdon): Dragging broken when scaled (disable until fixed).
  // TODO(burdon): Smoothly drop into place.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const item = items.find((item) => item.id === active.id)!;
    if (over) {
      item.location = parseLocation(over.id as string);
      onChange?.(item, item.location);
      forceUpdate({});
    }
  };

  // TODO(burdon): Externalize Container.
  return (
    <DndContext sensors={[mouseSensor]} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      {/* Full screen. */}
      <div className='relative flex flex-1'>
        <div
          ref={containerRef}
          className={mx('absolute w-full h-full overflow-auto bg-gray-500', 'snap-mandatory snap-both md:snap-none')}
        >
          {/* Layout container. */}
          <div className='flex justify-center items-center' style={{ ...containerDimensions, ...containerStyles }}>
            {/* Layout box. */}
            <div
              className='relative flex bg-gray-200'
              style={layout.dimensions}
              onClick={(event: any) => setZoom(event.detail === 2 ? options.zoomOut : 1)}
            >
              {layout.cells.map((location) => {
                const bounds = layout.getBounds(location);
                const item = getItem(location);

                return (
                  <Cell key={serializeLocation(location)} location={location} bounds={bounds} onCreate={handleCreate}>
                    {item && (
                      <div className='z-50'>
                        <Tile<T>
                          classes={classes?.tile}
                          item={item}
                          bounds={bounds}
                          Content={Content}
                          selected={item.id === selected}
                          onClick={() => setSelected(item.id)}
                          onDelete={onDelete}
                        />
                      </div>
                    )}
                  </Cell>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};
