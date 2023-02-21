//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, pointerWithin, useSensor } from '@dnd-kit/core';
import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { TileRequiredProps, Vec2 } from '../../props';
import { Tile } from '../../tiles';
import { GridCell } from './GridCell';
import { Layout, serializePosition, parsePosition } from './grid-layout';

export type GridTile = TileRequiredProps & { position: Vec2 };

export type GridProps<T extends GridTile> = {
  layout: Layout;
  tiles?: T[];
  onSelect?: (tile: T) => void;
  onChange?: (tile: T, position: Vec2) => void;
  onCreate?: (position: Vec2) => Promise<string | undefined>;
  onDelete?: (tile: T) => void;
};

const options = {
  transitionDelay: 500,
  zoomOut: 0.55,
  zoomIn: 2
};

// TODO(burdon): Pass in selected (and store in app state).
export const Grid = <T extends GridTile>({
  tiles = [],
  layout,
  onSelect,
  onChange,
  onCreate,
  onDelete
}: GridProps<T>) => {
  const getGridTile = (position: Vec2): T | undefined => {
    return tiles.find((item) => item.position && serializePosition(item.position) === serializePosition(position));
  };

  // Container allows any selected item to scroll near to the center.
  const containerSize: Vec2 = {
    x: layout.size.x * 1.5,
    y: layout.size.y * 1.5
  };

  /**
   * Calculate offset of the container relative to the screen of the given point.
   * The point is relative to the center of the layout.
   */
  const getOffset = (center: Vec2) => {
    if (!width || !height) {
      return { x: 0, y: 0 };
    }

    return {
      x: center.x - Math.round((width - containerSize.x) / 2),
      y: center.y - Math.round((height - containerSize.y) / 2)
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
  const scrollTo = (center: Vec2 = { x: 0, y: 0 }, smooth = true) => {
    const offset = getOffset(center);
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo
    containerRef.current.scrollTo({ left: offset.x, top: offset.y, behavior: smooth ? 'smooth' : 'instant' });
  };

  useEffect(() => {
    if (width && height) {
      const item = selected ? tiles.find((item) => item.id === selected) : undefined;
      scrollTo(layout.getCenter(item?.position ?? { x: 0, y: 0 }), false);
    }
  }, [width, height]);

  //
  // Create and select.
  //

  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    const item = selected ? tiles.find((item) => item.id === selected) : undefined;
    setZoom(zoom);
    scrollTo(layout.getCenter(item?.position ?? { x: 0, y: 0 }));
  }, [tiles, selected]);

  const handleCreate = async (point: Vec2) => {
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
    const item = tiles.find((item) => item.id === active.id)!;
    if (over) {
      item.position = parsePosition(over.id as string);
      onChange?.(item, item.position);
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
          <div
            className='flex justify-center tiles-center'
            style={{ width: containerSize.x, height: containerSize.y, ...containerStyles }}
          >
            {/* Layout box. */}
            <div
              className='relative flex bg-gray-200'
              style={{
                width: `${layout.size.x}px`,
                height: `${layout.size.y}px`
              }}
              onClick={(event: any) => setZoom(event.detail === 2 ? options.zoomOut : 1)}
            >
              {layout.cells.map((position) => {
                const box = layout.getBox(position);
                const tile = getGridTile(position);

                return (
                  <GridCell key={serializePosition(position)} position={position} box={box} onCreate={handleCreate}>
                    {tile && (
                      <Tile<T>
                        tile={tile}
                        extrinsicSize={box.size}
                        selected={tile.id === selected}
                        onClick={() => setSelected(tile.id)}
                        onDelete={onDelete}
                      />
                    )}
                  </GridCell>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};
