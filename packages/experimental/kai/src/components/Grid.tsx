//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

export type Item = {
  id: string;
  label: string;
  children?: Item[];
};

export type Point = { x: number; y: number };

export type Bounds = { x: number; y: number; width: number; height: number };

export type Layout = (item: Item) => Bounds;

//
// Cell
//

type CellProps = { item: Item; bounds: Bounds; onClick?: (item: Item, event: any) => void };

const Cell = ({ item, bounds, onClick }: CellProps) => {
  // prettier-ignore
  return (
    <div
      className='absolute flex justify-center items-center bg-white border border-gray-500 select-none cursor-pointer'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item, event);
      }}
    >
      {item.label}
    </div>
  );
};

//
// Grid
//

export type GridProps = { items?: Item[]; layout?: Layout; onSelect?: (item: Item) => void };

export const Grid = ({ items = [], layout, onSelect }: GridProps) => {
  const zoomFactor = 2;

  const [selected, setSelected] = useState<Item>();

  const [center, setCenter] = useState<Point>();
  const { ref: containerRef } = useResizeDetector();
  useEffect(() => {
    // https://www.quirksmode.org/dom/w3c_cssom.html#documentview
    const bounds = containerRef.current.getBoundingClientRect();
    setCenter({ x: bounds.width / 2, y: bounds.height / 2 });
  }, [containerRef]);

  // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
  const [style, setStyle] = useState<any>({
    transition: '500ms ease-in-out',
    transform: 'scale(1)'
  });

  // TODO(burdon): Store logical position in object list (splice).
  const bounds = useMemo(() => {
    const map = new Map<string, Bounds>();
    if (layout) {
      items.forEach((item) => {
        map.set(item.id, layout(item));
      });
    }

    return map;
  }, [layout, items]);

  // TODO(burdon): Overdraw bounds so can click outside.
  const handleSelect = (item: Item) => {
    if (item === selected) {
      handleReset();
      return;
    }

    const { x, y, width, height } = bounds.get(item.id)!;

    // Center on cell.
    const dx = center!.x - x - width / 2;
    const dy = center!.y - y - height / 2;

    setSelected(item);
    setStyle((style: any) => ({
      ...style,
      transform: `scale(${zoomFactor}) translate(${dx}px, ${dy}px)`
    }));
  };

  const handleReset = () => {
    setSelected(undefined);
    setStyle((style: any) => ({
      ...style,
      transform: 'scale(1)'
    }));
  };

  // TODO(burdon): Recursive layout.
  // TODO(burdon): Cache layout and trigger on update.
  return (
    <div ref={containerRef} className='flex flex-1 bg-gray-200' style={style} onClick={() => handleReset()}>
      {layout &&
        items.map((item) => <Cell key={item.id} item={item} bounds={bounds.get(item.id)!} onClick={handleSelect} />)}
    </div>
  );
};
