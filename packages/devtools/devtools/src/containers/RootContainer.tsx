//
// Copyright 2020 DXOS.org
//

import React, { Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { TreeView, TreeViewItem, Fallback } from '@dxos/react-appkit';
import { useClientServices } from '@dxos/react-client';

import { ErrorBoundary } from '../components';
import { useSections } from '../hooks';

// TODO(burdon): Restructure sections (panels).
// TODO(burdon): Sections as hook.

const Footer = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }
  return (
    <div className='flex flex-col shrink-0 m-2'>
      <Button
        variant='outline'
        onClick={async () => {
          await services?.SystemService.reset();
        }}
        classNames='w-full'
      >
        <span className='mis-2'>Reset Storage</span>
      </Button>
    </div>
  );
};

export const RootContainer = () => {
  const sections = useSections();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSelect = (item: TreeViewItem) => {
    navigate(item.id);
  };

  return (
    <div className='flex w-full h-screen overflow-hidden'>
      <div className={'flex flex-col w-[180px] overflow-hidden overflow-y-auto bg-gray-200 border-gray-400 border-r'}>
        <TreeView
          items={sections}
          slots={{ selected: { className: 'bg-gray-400' } }}
          selected={pathname}
          onSelect={handleSelect}
          expanded={sections.map((section) => section.id)}
        />
        <div className='flex-1' />
        <Footer />
      </div>

      <div className='flex flex-1 flex-col overflow-hidden bg-white'>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Fallback message='Loading...' />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
