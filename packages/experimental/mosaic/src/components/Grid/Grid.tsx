//
// Copyright 2023 DXOS.org
//

import { DndContext, type DragEndEvent, MouseSensor, pointerWithin, useSensor } from '@dnd-kit/core';
import isEqual from 'lodash.isequal';
import React, { type FC, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Event } from '@dxos/async';
import { mx } from '@dxos/react-ui-theme';

import { type Layout, type Item, type Point, type Location, serializeLocation, parseLocation } from '../../layout';
import { Cell, type CellSlots } from '../Cell';
import { Tile, type TileContentProps, type TileSlots } from '../Tile';

const options = {
  transitionDelay: 500,
};

/**
 * Offset and Zoom.
 */
export class GridLensModel {
  public readonly onChange = new Event();

  private readonly _aspect = {
    zoom: 1,
    offset: { x: 0, y: 0 },
  };

  constructor(
    private readonly _options = {
      zoomOut: 0.5,
    },
  ) {}

  get zoom() {
    return this._aspect.zoom;
  }

  get offset() {
    return this._aspect.offset;
  }

  setAspect({ zoom, offset }: { zoom?: number; offset?: Point }) {
    let modified = false;
    if (zoom !== undefined) {
      if (this._aspect.zoom !== zoom) {
        this._aspect.zoom = zoom;
        modified = true;
      }
    }

    if (offset !== undefined) {
      if (!isEqual(this._aspect.offset, offset)) {
        this._aspect.offset = offset;
        modified = true;
      }
    }

    if (modified) {
      this.onChange.emit();
    }
  }

  toggleZoom() {
    this.setAspect({ zoom: this.zoom === 1 ? this._options.zoomOut : 1 });
  }
}

export type GridSlots = {
  root?: {
    className?: string;
  };
  tile?: TileSlots;
  cell?: CellSlots;
};

export type GridProps<T extends {} = {}> = {
  items?: Item<T>[];
  layout: Layout;
  lensModel?: GridLensModel;
  slots?: GridSlots;
  Content: FC<TileContentProps<T>>;
  onSelect?: (item: Item<T>) => void;
  onChange?: (item: Item<T>, location: Location) => void;
  onCreate?: (location: Location) => Promise<string | undefined>;
  onDelete?: (item: Item<T>) => void;
};

// TODO(burdon): Pass in selected (and store in app state).
export const Grid = <T extends {} = {}>({
  items = [],
  layout,
  lensModel: controlledLensModel,
  slots = {},
  Content,
  onSelect,
  onChange,
  onCreate,
  onDelete,
}: GridProps<T>) => {
  const lensModel = useMemo(() => controlledLensModel ?? new GridLensModel(), [controlledLensModel]);
  const getItemById = (id?: string) => (id ? items.find((item) => item.id === id) : undefined);
  const getItemByLocation = (location: Location): Item<T> | undefined => {
    return items.find((item) => item.location && serializeLocation(item.location) === serializeLocation(location));
  };

  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 500 });
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8, // Move 10px before activating.
    },
  });

  const [containerStyles, setContainerStyles] = useState<{
    width?: number;
    height?: number;
    transition: string;
    transitionProperty: string;
    transform: string;
  }>({
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
    transition: `${options.transitionDelay}ms ease-in-out`,
    transitionProperty: 'transform',
    transform: 'scale(1)',
  });

  // TODO(burdon): Why is this required?
  const bounds = useRef({ width, height });
  useEffect(() => {
    bounds.current = { width, height };
  }, [width, height]);

  const updatePosition = (smooth = true) => {
    const { width, height } = bounds.current;

    setContainerStyles((styles) => {
      const newStyles = {
        ...styles,
        width: layout.dimensions.width + (width ?? 0),
        height: layout.dimensions.height + (height ?? 0),
      };

      // Calculate offset relative to center of layout.
      const center = layout.getCenter(lensModel.offset);
      const offset = {
        x: center.x * lensModel.zoom - (width === undefined ? 0 : Math.round((width - newStyles.width) / 2)),
        y: center.y * lensModel.zoom - (height === undefined ? 0 : Math.round((height - newStyles.height) / 2)),
      };

      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo
      containerRef.current.scrollTo({ left: offset.x, top: offset.y, behavior: smooth ? 'smooth' : 'instant' });

      return {
        ...newStyles,
        transform: `scale(${lensModel.zoom})`,
      };
    });
  };

  // Update when aspect changed.
  useEffect(() => {
    return lensModel.onChange.on(() => updatePosition(true));
  }, [lensModel]);

  const [selected, setSelected] = useState<string>();

  // Update when selection changed.
  useEffect(() => {
    const item = getItemById(selected);
    lensModel.setAspect({ offset: item?.location ?? { x: 0, y: 0 } });
  }, [items, selected]);

  // Update on first render and when resized.
  useEffect(() => {
    updatePosition(false);
  }, [width, height]);

  // Wait for initial scroll position to prevent flickering.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 100);
  }, []);

  //
  // Handlers
  //

  const handleSelect = (item: Item<T>) => {
    setSelected(item.id);
    onSelect?.(item);
  };

  const handleCreate = async (point: Point) => {
    if (onCreate) {
      const id = await onCreate(point);
      setSelected(id);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const item = items.find((item) => item.id === active.id)!;
    if (over) {
      item.location = parseLocation(over.id as string);
      onChange?.(item, item.location);
      forceUpdate();
    }
  };

  // TODO(burdon): Jumps on first render.

  return (
    <DndContext sensors={[mouseSensor]} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      {/* Full screen. */}
      <div className='relative flex flex-1'>
        <div
          ref={containerRef}
          className={mx(
            'absolute w-full h-full',
            'snap-mandatory snap-both md:snap-none',
            slots.root?.className,
            // Prevents flickering on initial render.
            visible ? 'visible overflow-auto' : 'invisible overflow-hidden',
          )}
        >
          {/* Layout container. */}
          <div
            className={mx('flex justify-center items-center', visible ? 'visible' : 'invisible')}
            style={containerStyles}
          >
            {/* Layout box. */}
            <div
              className='relative'
              style={layout.dimensions}
              onClick={(event: any) => {
                if (event.detail === 2) {
                  lensModel.toggleZoom();
                }
              }}
            >
              {layout.cells.map((location) => {
                const bounds = layout.getBounds(location);
                const item = getItemByLocation(location);

                return (
                  <Cell
                    key={serializeLocation(location)}
                    location={location}
                    bounds={bounds}
                    slots={slots?.cell}
                    onCreate={handleCreate}
                  >
                    {item && (
                      <div className='z-50'>
                        <Tile<T>
                          slots={slots?.tile}
                          item={item}
                          lensModel={lensModel}
                          bounds={bounds}
                          Content={Content}
                          selected={item.id === selected}
                          onClick={() => handleSelect(item)}
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
