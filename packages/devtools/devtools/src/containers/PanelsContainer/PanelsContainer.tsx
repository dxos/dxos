//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode, useState } from 'react';

import { FolderHierarchy, FolderHierarchyItem } from '@dxos/kai';
import { useClientServices } from '@dxos/react-client';

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
  const handleSelect = (item: FolderHierarchyItem) => {
    const newSelected = findItem(sections, item.id);
    if (newSelected?.panel) {
      setSelected(newSelected);
    }
  };

  const services = useClientServices();
  if (!services) {
    return null;
  }

  return (
    <div className='flex w-full h-screen overflow-hidden'>
      <div className={'flex flex-col w-[200px] overflow-hidden overflow-y-auto'}>
        <FolderHierarchy
          items={sections}
          titleClassName={'text-black text-lg'}
          onSelect={handleSelect}
          selected={selected?.id}
          expanded={sections.map((section) => section.id)}
        />
      </div>

      <div className='flex flex-1 flex-col overflow-hidden bg-white'>{selected?.panel}</div>
    </div>
  );
};
