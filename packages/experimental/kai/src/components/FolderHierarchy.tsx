//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from 'phosphor-react';
import React, { FC, ReactNode, useState } from 'react';

import { getSize, mx } from '@dxos/react-components';

const isScalar = (data: any) => !(typeof data === 'object' || Array.isArray(data));
const createKey = (key: string, prefix?: string) => (prefix === undefined ? key : `${prefix}.${key}`);

export const mapJsonToHierarchy = (data: any, prefix?: string): FolderHierarchyItem[] => {
  if (Array.isArray(data)) {
    return Object.values(data).map((value, i) => {
      const key = String(i);
      const item: FolderHierarchyItem = {
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
    const item: FolderHierarchyItem = {
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

export type FolderHierarchyItem = {
  id: string;
  title?: string; // TODO(burdon): Rename label; optional component.
  value?: any;
  Element?: ReactNode;
  Icon?: FC;
  items?: FolderHierarchyItem[];
};

// TODO(burdon): Slots.
// TODO(burdon): Navigate up/down.
// TODO(burdon): Unselect on Escape.

export const FolderHierarchy: FC<{
  items: FolderHierarchyItem[];
  highlightClassName?: string;
  titleClassName?: string;
  onSelect?: (item: FolderHierarchyItem) => void;
  selected?: string;
  expanded?: string[];
}> = ({
  items,
  highlightClassName = 'bg-gray-300',
  titleClassName = 'text-blue-600 text-base',
  onSelect,
  selected,
  expanded = []
}) => {
  const [openMap, setOpenMap] = useState<{ [key: string]: boolean }>(
    expanded?.reduce((map, id) => ({ ...map, [id]: true }), {})
  );

  const handleToggle = (item: FolderHierarchyItem) => {
    setOpenMap((map) => {
      if (map[item.id]) {
        delete map[item.id];
      } else {
        map[item.id] = true;
      }

      return { ...map };
    });
  };

  const handleSelection = (item: FolderHierarchyItem) => {
    onSelect?.(item);
  };

  const Item = ({ item, depth = 0 }: { item: FolderHierarchyItem; depth?: number }) => {
    const open = openMap[item.id];
    const sub = item.items && item.items.length > 0;
    const { Element, Icon } = item;

    return (
      <div className='flex flex-1 flex-col'>
        <div
          className={mx('flex select-none cursor-pointer pl-3', item.id === selected && highlightClassName)}
          onClick={() => handleSelection(item)}
        >
          <div className='flex items-center' style={{ marginLeft: depth * 16 }}>
            <div style={{ width: 20 }} onClick={() => handleToggle(item)}>
              {sub && (open ? <CaretDown className={getSize(3)} /> : <CaretRight className={getSize(3)} />)}
            </div>
            {Icon && (
              <div className='pr-1'>
                <Icon />
              </div>
            )}
            {Element || (
              <div style={{ lineHeight: 1.6 }}>
                <span className={titleClassName}>{item.title}</span>
                {!item.items && item.value !== undefined && <span className='pl-2'>{String(item.value)}</span>}
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
