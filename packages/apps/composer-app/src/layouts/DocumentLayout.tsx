//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { PublicKey, useSpace } from '@dxos/react-client';
import { defaultOsButtonColors, mx, useButtonShadow } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { SidebarContent, SidebarToggle } from '../components/Sidebar';

export const DocumentLayout = () => {
  const { spaceKey } = useParams();
  const space = useSpace(spaceKey ? PublicKey.fromHex(spaceKey) : undefined);
  const shadow = useButtonShadow('base');
  return (
    <PanelSidebarProvider
      slots={{
        content: { children: <SidebarContent />, className: mx(defaultOsButtonColors, shadow, 'backdrop-blur') },
        main: { role: 'main' }
      }}
    >
      <Outlet context={{ space }} />
      <SidebarToggle />
    </PanelSidebarProvider>
  );
};
