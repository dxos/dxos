//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from 'phosphor-react';
import React, { FC, ReactNode, useState } from 'react';

import { getSize } from '../../styles';
import { mx } from '../../util';

const isScalar = (data: any) => !(typeof data === 'object' || Array.isArray(data));
const createKey = (key: string, prefix?: string) => (prefix === undefined ? key : `${prefix}.${key}`);

export const mapJsonToHierarchy = (data: any, prefix?: string): TreeViewItem[] => {
  if (Array.isArray(data)) {
    return Object.values(data).map((value, i) => {
      const key = String(i);
      const item: TreeViewItem = {
        id: createKey(key, prefix)
      };

      if (isScalar(value)) {
        item.title = String(value);
      } else {
        item.title = String(i);
        item.items = mapJsonToHierarchy(value, key);
      }

      return item;
    });
  }

  return Object.entries(data).map(([key, value]) => {
    const item: TreeViewItem = {
      id: createKey(key, prefix),
      title: key,
      items: isScalar(value) ? undefined : mapJsonToHierarchy(value, key)
    };

    if (isScalar(value)) {
      item.value = value;
      // item.Element = (
      //   <div>
      //     <span>{key}</span>: <span>{String(value)}</span>
      //   </div>
      // );
    }

    return item;
  });
};

export type TreeViewItem = {
  id: string;
  title?: string; // TODO(burdon): Rename label; optional component.
  value?: any;
  Element?: ReactNode;
  Icon?: FC<any>;
  items?: TreeViewItem[];
};

// TODO(burdon): Navigate up/down.
// TODO(burdon): Unselect on Escape.

export type TreeViewSlots = {
  root?: {
    className?: string;
  };
  selected?: {
    className?: string;
  };
  title?: {
    className?: string;
  };
};

export type TreeViewProps = {
  items: TreeViewItem[];
  slots?: TreeViewSlots;
  onSelect?: (item: TreeViewItem) => void;
  selected?: string;
  expanded?: string[];
};

export const TreeView: FC<TreeViewProps> = ({ items, slots = {}, onSelect, selected, expanded = [] }) => {
  const [openMap, setOpenMap] = useState<{ [key: string]: boolean }>(
    expanded?.reduce((map, id) => ({ ...map, [id]: true }), {})
  );

  const handleToggle = (item: TreeViewItem) => {
    setOpenMap((map) => {
      if (map[item.id]) {
        delete map[item.id];
      } else {
        map[item.id] = true;
      }

      return { ...map };
    });
  };

  const handleSelection = (item: TreeViewItem) => {
    onSelect?.(item);
  };

  const Item = ({ item, depth = 0 }: { item: TreeViewItem; depth?: number }) => {
    const open = openMap[item.id];
    const sub = item.items && item.items.length > 0;
    const { Element, Icon } = item;

    return (
      <div className='flex flex-1 flex-col'>
        <div
          className={mx(
            'flex select-none cursor-pointer pl-3',
            slots.root?.className,
            item.id === selected && slots.selected?.className
          )}
          onClick={() => handleSelection(item)}
        >
          <div className='flex items-center' style={{ marginLeft: depth * 16 }}>
            <div style={{ width: 20 }} onClick={() => handleToggle(item)}>
              {sub && (open ? <CaretDown className={getSize(4)} /> : <CaretRight className={getSize(4)} />)}
            </div>
            {Icon && (
              <div className='pl-1 pr-2'>
                <Icon className={getSize(6)} />
              </div>
            )}
            {Element || (
              <div style={{ lineHeight: 1.6 }}>
                <span className={slots.title?.className}>{item.title}</span>
                {!item.items && item.value !== undefined && (
                  // eslint-disable-next-line no-octal-escape
                  <span className='pl-2 empty:after:content-["\00a0"]'>{String(item.value)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {item.items && open && (
          <div>
            {item.items.map((item) => (
              <Item key={item.id} item={item} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex flex-col'>
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
