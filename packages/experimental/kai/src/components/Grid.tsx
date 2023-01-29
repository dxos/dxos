//
// Copyright 2023 DXOS.org
//

import { DotsThreeCircle } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { getSize, mx } from '@dxos/react-components';

import { Button } from '../components';

export type Item = {
  id: string;
  label: string;
  content: string;
  children?: Item[];
};

export type Point = { x: number; y: number };

export type Bounds = { x: number; y: number; width: number; height: number };

export interface Layout {
  updateItems(items: Item[]): void;
  updateBounds(bounds: Bounds, grid: number, size: number): void;
  getBounds(id: string): Bounds | undefined;
}

//
// Cell
//

type CellProps = { item: Item; bounds: Bounds; onClick?: (item: Item, event: any) => void };

const Cell = ({ item, bounds, onClick }: CellProps) => {
  // prettier-ignore
  return (
    <div
      className={mx(
        'group',
        'absolute flex flex-col overflow-hidden p-2',
        'bg-yellow-100 shadow select-none cursor-pointer'
      )}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item, event);
      }}
    >
      <div className='flex flex-col overflow-hidden'>
        <div className='flex w-full items-center text-sm mb-2'>
          <div className='flex flex-1 overflow-hidden'>
            <h2 className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.label}</h2>
          </div>
          <div className='flex flex-shrink-0 pl-2'>
            <div className='invisible group-hover:visible text-gray-500'>
              <Button>
                <DotsThreeCircle className={getSize(6)} />
              </Button>
            </div>
          </div>
        </div>

        <div className='flex overflow-hidden text-xs text-gray-600'>
          {item.content}
        </div>
      </div>
    </div>
  );
};

//
// Grid
//

export type GridProps = { items?: Item[]; layout: Layout; onSelect?: (item: Item) => void };

export const Grid = ({ items = [], layout, onSelect }: GridProps) => {
  const transitionDelay = 500;
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
    transition: `${transitionDelay}ms ease-in-out`,
    transform: 'scale(1)'
  });

  // TODO(burdon): Editable mode on zoom.
  const handleSelect = (item: Item) => {
    if (item === selected) {
      handleReset();
      return;
    }

    const { x, y, width, height } = layout.getBounds(item.id)!;

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
        items.map((item) => {
          const bounds = layout.getBounds(item.id);
          if (!bounds) {
            return null;
          }

          return <Cell key={item.id} item={item} bounds={bounds} onClick={handleSelect} />;
        })}
    </div>
  );
};
