//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { XCircle } from 'phosphor-react';
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
  updateBounds(bounds: Bounds): void;
  getBounds(id: string): Bounds | undefined;
}

export type TestGridLayoutOptions = {
  range: number;
  size: number;
  padding: number;
};

// TODO(burdon): Factor out.
// TODO(burdon): Check doesn't overlap.
// TODO(burdon): Figure out coordinates: logical [x, y] to projected (based on center translation).
export class TestGridLayout implements Layout {
  private readonly _logical = new Map<string, Point | undefined>();
  private readonly _items = new Map<string, Bounds | undefined>();

  private _center?: Point;

  // prettier-ignore
  constructor(
    private readonly _options: TestGridLayoutOptions = { range: 3, size: 200, padding: 20 }
  ) {}

  // TODO(burdon): Garbage collection.
  updateItems(items: Item[]) {
    items.forEach((item) => {
      this._logical.set(item.id, {
        x: faker.datatype.number({ min: -this._options.range, max: this._options.range }),
        y: faker.datatype.number({ min: -this._options.range, max: this._options.range })
      });
    });
  }

  updateBounds(bounds: Bounds): void {
    this._center = { x: bounds.width / 2, y: bounds.height / 2 };
    const grid = this._options.size + this._options.padding;
    this._items.clear();
    for (const [id, point] of this._logical) {
      if (point) {
        this._items.set(id, {
          x: this._center.x - grid / 2 + point.x * grid,
          y: this._center.y - grid / 2 + point.y * grid,
          width: this._options.size + 1,
          height: this._options.size + 1
        });
      }
    }
  }

  getBounds(id: string) {
    return this._items.get(id);
  }
}

//
// Cell
//

type CellProps = {
  item: Item;
  bounds: Bounds;
  onClick?: (item: Item, event: any) => void;
  onDelete?: (item: Item) => void;
};

const Cell = ({ item, bounds, onClick, onDelete }: CellProps) => {
  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

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
              <Button onClick={handleDelete}>
                <XCircle className={getSize(6)} />
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

export type GridProps = {
  items?: Item[];
  layout?: Layout;
  onSelect?: (item: Item) => void;
  onDelete?: (item: Item) => void;
};

export const Grid = ({ items = [], layout, onSelect, onDelete }: GridProps) => {
  const transitionDelay = 500;
  const zoomFactor = 2;

  const [selected, setSelected] = useState<Item>();

  const [center, setCenter] = useState<Point>();
  const { ref: containerRef, width, height } = useResizeDetector();
  useEffect(() => {
    // https://www.quirksmode.org/dom/w3c_cssom.html#documentview
    const bounds = containerRef.current.getBoundingClientRect();
    setCenter({ x: bounds.width / 2, y: bounds.height / 2 });
    layout?.updateBounds(bounds);
  }, [containerRef, width, height]);

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

    const { x, y, width, height } = layout!.getBounds(item.id)!;

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
          const bounds = layout?.getBounds(item.id);
          if (!bounds) {
            return null;
          }

          return <Cell key={item.id} item={item} bounds={bounds} onClick={handleSelect} onDelete={onDelete} />;
        })}
    </div>
  );
};
