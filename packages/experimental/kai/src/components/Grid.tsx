//
// Copyright 2023 DXOS.org
//

import { PlusCircle, XCircle } from 'phosphor-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { getSize, mx } from '@dxos/react-components';

import { Button } from '../components';

// TODO(burdon): Factor out common geometry.
export type Point = { x: number; y: number };
export type Bounds = { point?: Point; x: number; y: number; width: number; height: number };

export type Item = {
  id: string;
  point: Point;
  label: string;
  content?: string;
  children?: Item[];
};

export interface Layout {
  updateItems(items: Item[]): void;
  updateBounds(bounds: Bounds): void;
  getBounds(id: string): Bounds | undefined;
  mapBounds(point: Point): Bounds;
}

export type TestGridLayoutOptions = {
  range: number;
  size: number;
  padding: number;
};

// TODO(burdon): Separate layout (where to put things) vs. projection (where on the screen).
// TODO(burdon): Figure out coordinates: logical [x, y] to projected (based on center translation).
export class TestGridLayout implements Layout {
  private readonly _items = new Map<string, Item>();
  private readonly _bounds = new Map<string, Bounds | undefined>();

  private _center: Point = { x: 0, y: 0 };

  // prettier-ignore
  constructor(
    private readonly _options: TestGridLayoutOptions = { range: 3, size: 200, padding: 20 }
  ) {}

  updateItems(items: Item[]) {
    this._items.clear();
    items.forEach((item) => {
      this._items.set(item.id, item);
    });
  }

  updateBounds(bounds: Bounds): void {
    this._center = { x: bounds.width / 2, y: bounds.height / 2 };
    this._bounds.clear();
    for (const [id, item] of this._items) {
      this._bounds.set(id, this.mapBounds(item.point));
    }
  }

  mapBounds(point: Point): Bounds {
    const grid = this._options.size + this._options.padding;
    return {
      point,
      x: this._center.x - grid / 2 + point.x * grid,
      y: this._center.y - grid / 2 + point.y * grid,
      width: this._options.size + 1,
      height: this._options.size + 1
    };
  }

  getBounds(id: string) {
    return this._bounds.get(id);
  }
}

//
// Cell
//

type CellProps = {
  item: Item;
  bounds: Bounds;
  onClick?: (item: Item, zoom: number) => void;
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
        onClick?.(item, event.details);
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

// TODO(burdon): Show button after delay (fade-in).
const Placeholder = ({ bounds, onCreate }: { bounds: Bounds; onCreate?: (point: Point) => void }) => {
  const handleClick = (event: any) => {
    if (onCreate) {
      event.stopPropagation();
      onCreate(bounds.point!);
    }
  };

  return (
    <div
      className='flex absolute group border cursor-pointer'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      <div className='relative flex flex-col flex-1 justify-center items-center invisible group-hover:visible border border-gray-300 border-dashed rounded-lg'>
        <Button onClick={handleClick}>
          <PlusCircle className={mx(getSize(8), 'text-gray-500')} />
        </Button>
        {/* <div className='absolute left-2 bottom-1 text-gray-400'>[{bounds.point?.x + ',' + bounds.point?.y}]</div> */}
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
  onCreate?: (point: Point) => void;
  onDelete?: (item: Item) => void;
};

export const Grid = ({ items = [], layout, onSelect, onCreate, onDelete }: GridProps) => {
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
    transform: 'scale(1)'
  });

  const handleZoom = (zoom = 1) => {
    setSelected(undefined);
    setStyle((style: any) => ({
      ...style,
      transform: `scale(${zoom})`
    }));
  };

  // TODO(burdon): Editable mode on zoom.
  const [selected, setSelected] = useState<Item>();
  const handleSelect = (item: Item, level: number) => {
    if (item === selected) {
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
      transform: `scale(${options.zoomIn}) translate(${dx}px, ${dy}px)`
    }));
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

              return <Cell key={item.id} item={item} bounds={bounds} onClick={handleSelect} onDelete={onDelete} />;
            })}
        </div>
      </div>
    </div>
  );
};
