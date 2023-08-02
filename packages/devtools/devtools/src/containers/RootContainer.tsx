//
// Copyright 2020 DXOS.org
//

import { Download } from '@phosphor-icons/react';
import React, { Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { TreeView, TreeViewItem, useFileDownload } from '@dxos/react-appkit';
import { useClient, useClientServices } from '@dxos/react-client';

import { ErrorBoundary } from '../components';
import { useSections } from '../hooks';

// TODO(burdon): Restructure sections (panels).
// TODO(burdon): Sections as hook.
process.env.PACKAGE_VERSION = '1.1.1';

const Footer = () => {
  const services = useClientServices();
  if (!services) {
    return null;
  }
  const fileDownload = useFileDownload();

  const client = useClient();
  const downloadDiagnostics = async () => {
    const diagnostics = await client.diagnostics();
    fileDownload(new Blob([JSON.stringify(diagnostics, undefined, 2)], { type: 'text/plain' }), 'diagnostics.json');
  };

  return (
    <>
      <div className='flex-1' />
      <div className='flex flex-col shrink-0 justify-center p-2 space-y-2'>
        {/* Print current package version */}
        <Button variant='primary' onClick={downloadDiagnostics}>
          <Download className={getSize(4)} />
          <span className='m-2'>Diagnostics</span>
        </Button>
        <div className='flex shrink-1 justify-center '>
          {process.env.PACKAGE_VERSION && (
            <span className='text-xs text-gray-500'>Version: {process.env.PACKAGE_VERSION}</span>
          )}
        </div>
      </div>
    </>
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
