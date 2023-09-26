//
// Copyright 2020 DXOS.org
//

import React, { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { getSize, mx } from '@dxos/aurora-theme';
import { useDevices, useIdentity } from '@dxos/react-client/halo';

import { ErrorBoundary } from '../components';
import { useSections } from '../hooks';

const Footer = () => {
  return (
    <div className='flex justify-center p-2'>
      <span className='text-xs text-gray-500'>
        <div>Identity: {useIdentity()?.identityKey.truncate()}</div>
        <div>Device: {useDevices()[0].deviceKey.truncate()}</div>
        <div>Version: {process.env.PACKAGE_VERSION ?? 'DEV'}</div>
      </span>
    </div>
  );
};

export const RootContainer = () => {
  const sections = useSections();
  const { pathname } = useLocation();

  return (
    <div className='flex w-full h-screen overflow-hidden'>
      <div className={'flex flex-col w-[180px] shrink-0 overflow-hidden overflow-y-auto bg-gray-100'}>
        <div className='flex flex-col gap-4 divide-y'>
          {sections.map((section) => (
            <div key={section.id}>
              <div className='flex text-sm pis-4 py-1'>{section.title}</div>
              <div>
                {section.items?.map(({ id, title, Icon }) => (
                  <div
                    key={id}
                    className={mx(
                      'flex items-center pis-4 gap-2 text-neutral-600',
                      id === pathname && 'bg-sky-600 text-white',
                    )}
                  >
                    <Icon className={getSize(5)} />
                    <Link to={id} className='grow'>
                      <span>{title}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className='grow' />
        <Footer />
      </div>

      <div className='flex flex-col grow overflow-hidden bg-white'>
        <ErrorBoundary key={pathname}>
          <Suspense>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
