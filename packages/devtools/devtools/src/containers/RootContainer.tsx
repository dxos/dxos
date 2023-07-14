//
// Copyright 2020 DXOS.org
//

import React, { Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { TreeView, TreeViewItem } from '@dxos/react-appkit';
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
    <div className='flex flex-col shrink-0 p-2'>
      {/* Print current package version */}
      {process.env.PACKAGE_VERSION && (
        <div className='flex flex-row justify-center p-2'>
          <span className='text-xs text-gray-500'>Version: {process.env.PACKAGE_VERSION}</span>
        </div>
      )}
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
      <div className={'flex flex-col w-[180px] overflow-hidden overflow-y-auto bg-gray-100'}>
        <TreeView
          items={sections}
          expanded={sections.map((section) => section.id)}
          slots={{ title: { className: 'ml-1' }, selected: { className: 'bg-blue-600 text-white' } }}
          selected={pathname}
          onSelect={handleSelect}
        />
        <div className='flex-1' />
        <Footer />
      </div>

      <div className='flex flex-1 flex-col overflow-hidden bg-white'>
        <ErrorBoundary key={pathname}>
          <Suspense>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
