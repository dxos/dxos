//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { getSize } from '@dxos/react-ui';

export type Item = {
  id: string;
  Icon?: FC;
  title: string;
  items?: Item[];
};

export const FolderHierarchy: FC<{ items: Item[] }> = ({ items }) => {
  // TODO(burdon): Externalize.
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

  const Item = ({ item, depth = 0 }: { item: Item; depth?: number }) => {
    const open = openMap[item.id];
    return (
      <div className='flex flex-col' style={{ marginLeft: depth ? 16 : 0 }}>
        <div className='flex items-center select-none cursor-pointer' onClick={() => handleToggle(item)}>
          <div style={{ width: 20 }}>
            {item.items?.length &&
              (open ? <CaretDown className={getSize(3)} /> : <CaretRight className={getSize(3)} />)}
          </div>
          <div>{item.title}</div>
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
