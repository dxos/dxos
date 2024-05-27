//
// Copyright 2020 DXOS.org
//

import React, { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { DeviceKind, useDevices, useIdentity } from '@dxos/react-client/halo';
import { getSize, mx } from '@dxos/react-ui-theme';

import { ErrorBoundary } from '../components';
import { useSections } from '../hooks';

export const RootContainer = () => {
  const sections = useSections();
  const { pathname } = useLocation();

  return (
    <div className='flex is-full bs-full overflow-hidden'>
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

const Footer = () => {
  const identity = useIdentity();
  const devices = useDevices();
  const device = devices.find(({ kind }) => kind === DeviceKind.CURRENT);

  return (
    <div className='flex p-2'>
      <div className='flex flex-col w-full text-sm text-neutral-500'>
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
