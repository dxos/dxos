//
// Copyright 2022 DXOS.org
//

import {
  AddressBook,
  DeviceMobileCamera,
  Planet,
  SignOut,
  UserCircle
} from 'phosphor-react';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import {
  NavMenu,
  NavMenuSeparatorProps,
  useTranslation
} from '@dxos/react-uikit';

const iconAttributes = { className: 'h-5 w-5' };

export const AppLayout = () => {
  const { t } = useTranslation('halo');
  const location = useLocation();

  const centerMenuItems = [
    {
      label: t('lock label'),
      icon: <SignOut mirrored {...iconAttributes} />,
      pathName: '/'
    },
    {
      separator: true
    } as NavMenuSeparatorProps,
    {
      label: t('spaces label'),
      icon: <Planet {...iconAttributes} />,
      pathName: '/spaces'
    },
    {
      label: t('contacts label'),
      icon: <AddressBook {...iconAttributes} />,
      pathName: '/contacts'
    },
    {
      label: t('apps label'),
      icon: <UserCircle {...iconAttributes} />,
      pathName: '/apps'
    },
    {
      label: t('devices label'),
      icon: <DeviceMobileCamera {...iconAttributes} />,
      pathName: '/devices'
    },
    {
      separator: true
    } as NavMenuSeparatorProps,
    {
      label: t('identity label'),
      icon: <UserCircle {...iconAttributes} />,
      pathName: '/identity'
    }
  ];

  return (
    <div role='none' className='mt-24'>
      <div role='none' className='fixed top-5 left-0 right-0'>
        <NavMenu
          items={centerMenuItems.map((navMenuItem) =>
            'separator' in navMenuItem
              ? navMenuItem
              : {
                  triggerLinkProps: { href: `#${navMenuItem.pathName}` },
                  children: (
                    <div className='flex items-center gap-1'>
                      {navMenuItem.icon}
                      <span>{navMenuItem.label}</span>
                    </div>
                  ),
                  ...(navMenuItem.pathName.length > 1 &&
                    location.pathname.startsWith(navMenuItem.pathName) && {
                      active: true
                    })
                }
          )}
          className='hidden md:flex'
        />

        <NavMenu
          items={centerMenuItems.map((navMenuItem) =>
            'separator' in navMenuItem
              ? navMenuItem
              : {
                  triggerLinkProps: { href: `#${navMenuItem.pathName}` },
                  children: navMenuItem.icon,
                  tooltip: {
                    align: 'center',
                    tooltipLabelsTrigger: true,
                    content: navMenuItem.label,
                    sideOffset: 8
                  },
                  ...(navMenuItem.pathName.length > 1 &&
                    location.pathname.startsWith(navMenuItem.pathName) && {
                      active: true
                    })
                }
          )}
          className='flex md:hidden'
        />
      </div>

      <Outlet />
    </div>
  );
};
