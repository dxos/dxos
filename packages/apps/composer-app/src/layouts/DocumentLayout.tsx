//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { defaultOsButtonColors, mx, useButtonShadow } from '@dxos/react-components';
import { PanelSidebarProvider, ShellProvider } from '@dxos/react-ui';

import { SidebarContent, SidebarToggle } from '../components/Sidebar';
import { abbreviateKey } from '../routes';

export const DocumentLayout = () => {
  const { spaceKey } = useParams();
  const spaces = useSpaces();
  const space = spaces.find((space) => abbreviateKey(space.key) === spaceKey);
  const shadow = useButtonShadow('base');

  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');

  return (
    <ShellProvider
      space={space}
      spaceInvitationCode={spaceInvitationCode}
      haloInvitationCode={haloInvitationCode}
      onJoinedSpace={(spaceKey) => {
        console.log('[joined space]', spaceKey);
      }}
    >
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
    </ShellProvider>
  );
};
