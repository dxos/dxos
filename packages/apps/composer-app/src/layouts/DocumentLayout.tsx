//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { defaultOsButtonColors, mx, useButtonShadow } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { SidebarContent, SidebarToggle } from '../components/Sidebar';
import { abbreviateKey } from '../routes';

export const DocumentLayout = () => {
  const { spaceKey } = useParams();
  const spaces = useSpaces();
  const space = spaces.find((space) => abbreviateKey(space.key) === spaceKey);
  const shadow = useButtonShadow('base');
  return (
    <PanelSidebarProvider
      slots={{
        content: {
          children: <SidebarContent />,
          className: mx(defaultOsButtonColors, shadow, 'backdrop-blur overflow-visible')
        },
        main: { role: 'main', className: 'min-bs-full' }
      }}
    >
      <Outlet context={{ space }} />
      <SidebarToggle />
    </PanelSidebarProvider>
  );
};
