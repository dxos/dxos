//
// Copyright 2020 DXOS.org
//

import React, { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { DeviceKind, useDevices, useIdentity } from '@dxos/react-client/halo';
import { Icon, ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { ErrorBoundary } from '../components';
import { useSections } from '../hooks';

export const RootContainer = () => {
  const { pathname } = useLocation();

  return (
    <div className='flex inline-full block-full overflow-hidden'>
      <Sidebar />
      <div className='flex flex-col grow overflow-hidden'>
        <ErrorBoundary key={pathname}>
          <Suspense>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const sections = useSections();
  return (
    <ScrollArea.Root orientation='vertical' classNames='inline-[180px] border-ie border-separator'>
      <ScrollArea.Viewport classNames='gap-4 divide-y divide-separator'>
        {sections.map((section) => (
          <div key={section.id}>
            <div className='flex text-sm pl-4 py-1'>{section.title}</div>
            <div>
              {section.items?.map(({ id, title, icon }) => (
                <div key={id} className={mx('flex items-center pl-4 gap-2', id === pathname && 'bg-active-surface')}>
                  <Icon icon={icon} size={4} />
                  <Link to={id} className='grow'>
                    <span>{title}</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className='grow' />
        <Footer />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const Footer = () => {
  const identity = useIdentity();
  const devices = useDevices();
  const device = devices.find(({ kind }) => kind === DeviceKind.CURRENT);

  return (
    <div className='flex p-2'>
      <div className='flex flex-col inline-full text-sm text-neutral-500'>
        <div className='grid grid-cols-2 gap-2'>
          <div className='text-neutral-300 text-right'>Identity</div>
          <div className='font-mono'>{identity?.identityKey.truncate()}</div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div className='text-neutral-300 text-right'>Device</div>
          <div className='font-mono'>{device?.deviceKey.truncate()}</div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div className='text-neutral-300 text-right'>Version</div>
          <div className='font-mono'>{process.env.PACKAGE_VERSION ?? 'DEV'}</div>
        </div>
      </div>
    </div>
  );
};
