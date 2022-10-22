//
// Copyright 2022 DXOS.org
//

import { Planet, DeviceMobileCamera, UserCircle } from 'phosphor-react';
import React, { useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useProfile } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { Button, NavMenu, useTranslation } from '@dxos/react-uikit';

import { AppToolbar } from './AppToolbar';

export const AppLayout = () => {
  const { t } = useTranslation('halo');
  const profile = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLock = useCallback(() => {
    navigate('/');
  }, []);

  const navMenuItems = [
    {
      label: <div className='flex items-center'><Planet className='mr-1 h-5 w-5' /><span>{t('spaces label')}</span></div>,
      url: '/spaces'
    },
    {
      label: <div className='flex items-center'><DeviceMobileCamera className='mr-1 h-5 w-5' /><span>{t('devices label')}</span></div>,
      url: '/devices'
    },
    {
      label: <div className='flex items-center'><UserCircle className='mr-1 h-5 w-5' /><span>{t('identity label')}</span></div>,
      url: '/identity'
    }
  ];

  return (
    <FullScreen>
      <AppToolbar dense profile={profile}>
        <Button onClick={handleLock}>{t('lock label')}</Button>
      </AppToolbar>

      <NavMenu
        items={navMenuItems.map((navMenuItem) => ({
          triggerLinkProps: { href: navMenuItem.url },
          children: navMenuItem.label,
          ...(location.pathname.startsWith(navMenuItem.url) && { active: true })
        }))}
      />

      <Outlet />
    </FullScreen>
  );
};
