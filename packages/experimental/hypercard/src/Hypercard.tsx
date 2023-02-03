//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, pointerWithin, useSensor } from '@dnd-kit/core';
import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { Cell, CellSlots } from './Cell';
import { Placeholder } from './Placeholder';
import { Bounds, Item, Point, toString, fromString, Dimensions } from './defs';

export interface HypercardLayout {
  range: number;
  dimensions: Dimensions;
  placeholders: Point[];
  getBounds(point: Point): Bounds;
}

export type HypercardSlots = {
  cell?: CellSlots;
};

export type HypercardProps = {
  layout: HypercardLayout;
  items?: Item[];
  slots?: HypercardSlots;
  onSelect?: (item: Item) => void;
  onCreate?: (point: Point) => Promise<Item | undefined>;
  onDelete?: (item: Item) => void;
};

const options = {
  transitionDelay: 500,
  zoomOut: 0.55,
  zoomIn: 2
};

// TODO(burdon): Scrolling is relative to top-left.
//  - Outer container should be max range (don't consider infinite scrolling).
//  - Scroll center into view.

export const Hypercard = ({ items = [], layout, slots = {}, onSelect, onCreate, onDelete }: HypercardProps) => {
  const getItem = (point: Point): Item | undefined => {
    return items.find((item) => toString(item.point) === toString(point));
  };

  // Container allows any selected item to scroll near to the center.
  const containerDimensions: Dimensions = {
    width: layout.dimensions.width * 1.5,
    height: layout.dimensions.height * 1.5
  };

  // TODO(burdon): Move to layout. Offset from center.
  const getCenter = (point: Point): Point => {
    const bounds = layout.getBounds(point);
    return {
      x: bounds.x + bounds.width / 2 - layout.dimensions.width / 2,
      y: bounds.y + bounds.height / 2 - layout.dimensions.height / 2
    };
  };

  /**
   * Calculate offset of the container relative to the screen of the given point.
   * The point is relative to the center of the layout.
   */
  const getOffset = (center: Point) => {
    if (!width || !height) {
      return { x: 0, y: 0 };
    }

    const offset = {
      x: center.x - Math.round((width - containerDimensions.width) / 2),
      y: center.y - Math.round((height - containerDimensions.height) / 2)
    };

    return offset;
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
      scrollTo(getCenter(selected?.point ?? { x: 0, y: 0 }));
    }
  }, [width, height]);

  //
  // Create and select.
  //

  const [selected, setSelected] = useState<Item>();
  const handleSelect = (item: Item | undefined, level = 1) => {
    setSelected(item);
    setZoom(1);
    scrollTo(getCenter(item?.point ?? { x: 0, y: 0 }));
  };

  const handleCreate = async (point: Point) => {
    if (onCreate) {
      const item = await onCreate(point);
      handleSelect(item);
    }
  };

  //
  // DND
  //

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10 // Move 10px before activating.
    }
  });

  // TODO(burdon): Smoothly drop into place.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const item = items.find((item) => item.id === active.id)!;
    if (over) {
      item.point = fromString(over.id as string);
      forceUpdate({});
    }
  };

  return (
    <DndContext sensors={[mouseSensor]} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      {/* Full screen. */}
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
            {layout.placeholders.map((point, i) => {
              const bounds = layout.getBounds(point);
              const item = getItem(point);

              return (
                <Placeholder key={toString(point)} point={point} bounds={bounds} onCreate={handleCreate}>
                  {item && (
                    <div className='z-50'>
                      <Cell
                        slots={slots?.cell}
                        item={item}
                        bounds={bounds}
                        selected={item === selected}
                        onClick={() => handleSelect(item, 1)}
                        onZoom={() => handleSelect(item, 2)}
                        onDelete={onDelete}
                      />
                    </div>
                  )}
                </Placeholder>
              );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
};
