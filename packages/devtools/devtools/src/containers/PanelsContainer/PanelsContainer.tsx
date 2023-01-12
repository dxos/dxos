//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode, useState } from 'react';

import { FolderHierarchy, FolderHierarchyItem } from '@dxos/kai';
import { useClientServices } from '@dxos/react-client';
import { mx } from '@dxos/react-components';

export type SectionItem = {
  id: string;
  title: string;
  Icon?: FC;
  panel?: ReactNode;
  items?: SectionItem[];
};

const findItem = (items: SectionItem[], id: string): SectionItem | undefined => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.items) {
      const subItem = findItem(item.items, id);
      if (subItem) {
        return subItem;
      }
    }
  }
};

export const PanelsContainer = ({ sections }: { sections: SectionItem[] }) => {
  const [selected, setSelected] = useState(sections[0]?.items?.[0]);
  const services = useClientServices();
  if (!services) {
    return null;
  }

  return (
    <div className='flex flex-1 flex-row w-full h-screen bg-gray overflow-hidden'>
      <div className={mx('flex flex-col w-60 h-screen bg-white', 'overflow-auto scrollbar-thin', 'mr-2')}>
        <FolderHierarchy
          items={sections}
          highlightClassName='bg-slate-200'
          onSelect={(item: FolderHierarchyItem) => {
            const newSelected = findItem(sections, item.id);
            if (newSelected?.panel) {
              setSelected(newSelected);
            }
          }}
          selected={selected?.id}
          expanded={[sections[0].id]}
        />
      </div>

      <div className='flex flex-1 flex-col w-36 bg-white overflow-auto scrollbar-thin mt-2 mb-2'>
        {selected?.panel ?? selected!.panel}
      </div>
    </div>
  );
};
