//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';

import { useTelemetry } from '@dxos/react-appkit';
import { SpaceState, useSpaces } from '@dxos/react-client';
import { defaultOsButtonColors, mx, useButtonShadow } from '@dxos/react-components';
import { PanelSidebarProvider, ShellProvider } from '@dxos/react-ui';

import { SidebarContent, SidebarToggle } from '../../components';
import { OctokitProvider } from '../../components/OctokitProvider';
import { namespace, abbreviateKey } from '../../router';

export const DocumentLayout = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace });
  const shadow = useButtonShadow('base');

  const { spaceKey } = useParams();
  const spaces = useSpaces({ all: true });
  const space = spaces.find((space) => abbreviateKey(space.key) === spaceKey && space.state.get() === SpaceState.READY);

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
      <OctokitProvider>
        <PanelSidebarProvider
          slots={{
            content: {
              children: <SidebarContent />,
              className: mx(defaultOsButtonColors, shadow, 'backdrop-blur overflow-visible'),
              onOpenAutoFocus: (event) => event.preventDefault(),
              onCloseAutoFocus: (event) => event.preventDefault()
            },
            main: { role: 'main', className: 'min-bs-full' }
          }}
        >
          <Outlet context={{ space }} />
          <SidebarToggle />
        </PanelSidebarProvider>
      </OctokitProvider>
    </ShellProvider>
  );
};
