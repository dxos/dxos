//
// Copyright 2022 DXOS.org
//

import { AddressBook, DeviceMobileCamera, DiamondsFour, Planet, SignOut } from 'phosphor-react';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { NavMenu as NaturalNavMenu, NavMenuSeparatorProps, useTranslation } from '@dxos/react-uikit';

const iconAttributes = { className: 'h-5 w-5' };

export const NavMenu = () => {
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
      label: t('devices label'),
      icon: <DeviceMobileCamera {...iconAttributes} />,
      pathName: '/devices'
    },
    {
      label: t('contacts label'),
      icon: <AddressBook {...iconAttributes} />,
      pathName: '/contacts'
    },
    {
      label: t('apps label'),
      icon: <DiamondsFour {...iconAttributes} />,
      pathName: '/apps'
    },
    {
      label: t('spaces label'),
      icon: <Planet {...iconAttributes} />,
      pathName: '/spaces'
    }
  ];
  return (
    <>
      <NaturalNavMenu
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
        slots={{ root: { className: 'hidden md:flex grow-0 shrink pointer-events-auto' } }}
      />
      {/* Compact menu (max-width: md) */}
      <NaturalNavMenu
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
        slots={{ root: { className: 'flex md:hidden grow-0 shrink pointer-events-auto' } }}
      />
    </>
  );
};
