//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { getSize, mx } from '@dxos/react-ui';

export type Item = {
  id: string;
  Icon?: FC;
  title: string;
  items?: Item[];
};

export const FolderHierarchy: FC<{ items: Item[] }> = ({ items }) => {
  // TODO(burdon): Externalize.
  const [selected, setSelected] = useState<string>();
  const [openMap, setOpenMap] = useState<{ [key: string]: boolean }>({});
  const handleToggle = (item: Item) => {
    setOpenMap((map) => {
      if (map[item.id]) {
        delete map[item.id];
      } else {
        map[item.id] = true;
      }

      return { ...map };
    });
  };

  // TODO(burdon): Style colors?
  const Item = ({ item, depth = 0 }: { item: Item; depth?: number }) => {
    const open = openMap[item.id];
    return (
      <div className='flex flex-col'>
        <div
          className={mx('flex select-none cursor-pointer pl-4', item.id === selected && 'bg-slate-800')}
          onClick={() => setSelected(item.id)}
        >
          <div className='flex items-center text-sm' style={{ marginLeft: depth * 16 }}>
            <div style={{ width: 20 }} onClick={() => handleToggle(item)}>
              {item.items?.length &&
                (open ? <CaretDown className={getSize(3)} /> : <CaretRight className={getSize(3)} />)}
            </div>
            <div>{item.title}</div>
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
    <div className='flex flex-col'>
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
};
