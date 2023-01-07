//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { getSize, mx } from '@dxos/react-components';

export type FolderHierarchyItem = {
  id: string;
  Icon?: FC;
  title: string;
  items?: FolderHierarchyItem[];
};

export const FolderHierarchy: FC<{ items: FolderHierarchyItem[]; highlightClassName?: string }> = ({
  items,
  highlightClassName = 'bg-gray-300'
}) => {
  // TODO(burdon): Externalize.
  const [selected, setSelected] = useState<string>();
  const [openMap, setOpenMap] = useState<{ [key: string]: boolean }>({});
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

  const Item = ({ item, depth = 0 }: { item: FolderHierarchyItem; depth?: number }) => {
    const open = openMap[item.id];
    const sub = item.items && item.items.length > 0;

    return (
      <div className='flex flex-1 flex-col'>
        <div
          className={mx('flex select-none cursor-pointer pl-3', item.id === selected && highlightClassName)}
          onClick={() => setSelected(item.id)}
        >
          <div className='flex items-center text-xs' style={{ marginLeft: depth * 16 }}>
            <div style={{ width: 20 }} onClick={() => handleToggle(item)}>
              {sub && (open ? <CaretDown className={getSize(3)} /> : <CaretRight className={getSize(3)} />)}
            </div>
            <div style={{ lineHeight: 1.6 }}>{item.title}</div>
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
