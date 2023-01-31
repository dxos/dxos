//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Cell } from './Cell';
import { Placeholder } from './Placeholder';
import { Bounds, Item, Point } from './defs';

export interface HypercardLayout {
  updateItems(items: Item[]): void;
  updateBounds(bounds: Bounds): void;
  getBounds(id: string): Bounds | undefined;
  mapBounds(point: Point): Bounds;
}

export type HypercardSlots = {
  cell?: string;
};

export type HypercardProps = {
  items?: Item[];
  layout?: HypercardLayout;
  classes?: HypercardSlots;
  onSelect?: (item: Item) => void;
  onCreate?: (point: Point) => void;
  onDelete?: (item: Item) => void;
};

export const Hypercard = ({ items = [], layout, classes = {}, onSelect, onCreate, onDelete }: HypercardProps) => {
  // TODO(burdon): Options.
  const options = {
    transitionDelay: 500,
    zoomOut: 0.55,
    zoomIn: 2,
    zoomDetail: 4
  };

  useEffect(() => {
    layout?.updateItems(items);
  }, [items]);

  const [center, setCenter] = useState<Point>();
  const { ref: containerRef, width, height } = useResizeDetector();
  useEffect(() => {
    // https://www.quirksmode.org/dom/w3c_cssom.html#documentview
    const bounds = containerRef.current.getBoundingClientRect();
    setCenter({ x: bounds.width / 2, y: bounds.height / 2 });
    layout?.updateBounds(bounds);
  }, [containerRef, layout, width, height, items.length]);

  // TODO(burdon): Util to create grid.
  const placeholders = useMemo<Bounds[]>(() => {
    const range = 3;
    const bounds: Bounds[] = [];
    if (layout) {
      for (let x = -range; x <= range; x++) {
        for (let y = -range; y <= range; y++) {
          bounds.push(layout.mapBounds({ x, y }));
        }
      }
    }

    return bounds;
  }, [containerRef, layout, width, height]);

  // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
  const [style, setStyle] = useState<any>({
    transition: `${options.transitionDelay}ms ease-in-out`,
    transform: 'scale(1)',
    opacity: 1
  });

  // TODO(burdon): Reuse.
  const handleZoom = (zoom = 1) => {
    setSelected(undefined);
    setStyle((style: any) => ({
      ...style,
      transform: `scale(${zoom})`,
      opacity: 1
    }));
  };

  // TODO(burdon): Editable mode on zoom.
  const [selected, setSelected] = useState<Item>();
  const handleSelect = (item: Item, level = 1) => {
    if (item === selected && level === 1) {
      handleZoom(1);
      return;
    }

    const { x, y, width, height } = layout!.getBounds(item.id)!;

    // Center on cell.
    const dx = center!.x - x - width / 2;
    const dy = center!.y - y - height / 2;

    setSelected(item);
    setStyle((style: any) => ({
      ...style,
      transform: `scale(${level === 1 ? options.zoomIn : options.zoomDetail}) translate(${dx}px, ${dy}px)`
      // opacity: level === 1 ? 1 : 0
    }));

    // TODO(burdon): Navigate to frame.
    // TODO(burdon): Render different element if zoomed?
    // TODO(burdon): Define states (zoom, selected, etc.)
  };

  // TODO(burdon): Scrolling is relative to top-left.
  //  - Outer container should be max range (don't consider infinite scrolling).
  //  - Scroll center into view.
  return (
    <div ref={containerRef} className='flex flex-1 overflow-auto bg-gray-500'>
      <div
        className='flex flex-1 bg-gray-200'
        style={style}
        onClick={(event: any) => handleZoom(event.detail === 2 ? options.zoomOut : 1)}
      >
        <div>
          {placeholders?.map((bounds, i) => (
            <Placeholder key={i} bounds={bounds} onCreate={onCreate} />
          ))}
        </div>

        <div>
          {layout &&
            // TODO(burdon): Recursive layout.
            items.map((item) => {
              const bounds = layout?.getBounds(item.id);
              if (!bounds) {
                return null;
              }

              return (
                <Cell
                  key={item.id}
                  className={classes?.cell}
                  item={item}
                  bounds={bounds}
                  level={item === selected ? 1 : 0}
                  onClick={() => handleSelect(item, 1)}
                  onZoom={() => handleSelect(item, 2)}
                  onDelete={onDelete}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
};
