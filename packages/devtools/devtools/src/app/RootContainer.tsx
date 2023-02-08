//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { TreeView, TreeViewItem } from '@dxos/kai';
import { useClientServices } from '@dxos/react-client';

import { useSections } from '../hooks';

// TODO(burdon): Restructure sections (panels).
// TODO(burdon): Sections as hook.

export const RootContainer = () => {
  const sections = useSections();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSelect = (item: TreeViewItem) => {
    navigate(item.id);
  };

  const services = useClientServices();
  if (!services) {
    return null;
  }

  return (
    <div className='flex w-full h-screen overflow-hidden'>
      <div className={'flex flex-col w-[180px] overflow-hidden overflow-y-auto bg-gray-200 border-gray-400 border-r'}>
        <TreeView
          items={sections}
          selected={pathname}
          onSelect={handleSelect}
          expanded={sections.map((section) => section.id)}
          titleClassName={'text-black pl-1 text-sm'}
        />
      </div>

      <div className='flex flex-1 flex-col overflow-hidden bg-white'>
        <Outlet />
      </div>
    </div>
  );
};
