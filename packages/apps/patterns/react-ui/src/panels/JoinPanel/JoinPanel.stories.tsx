//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { StoryFn } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { Client, Invitation, CancellableInvitationObservable, InvitationEncoder } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

import { JoinPanel } from './JoinPanel';
import { JoinPanelProps } from './JoinPanelProps';

const log = console.log;

export default {
  component: JoinPanel
};
export const Default = {
  render: (props: JoinPanelProps) => <JoinPanel {...props} />,
  decorators: [
    // TODO(wittjosiah): Factor out.
    (Story: StoryFn) => {
      const n = 2;
      const testBuilder = new TestBuilder();
      const clients = useMemo(() => {
        return [...Array(n)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
      }, []);

      const [invitation, setInvitation] = useState<CancellableInvitationObservable>();

      useAsyncEffect(async () => {
        await Promise.all(clients.map((client) => client.initialize()));
        log('[initialized]');

        await clients[0].halo.createProfile({ displayName: 'Os Mutantes' });

        const space = await clients[0].echo.createSpace();
        log('[space created]', space);
        await space?.setProperty('title', 'Q3 2022 Planning');
        log('[space title set]', space?.getProperty('title'));

        const invitation = await space.createInvitation({ type: Invitation.Type.INTERACTIVE });
        log('[invitation created]', invitation.invitation);

        invitation.subscribe({
          onAuthenticating: log,
          onCancelled: () => log,
          onConnected: () => log,
          onConnecting: () => log,
          onError: () => log,
          onSuccess: () => log,
          onTimeout: () => log
        });

        const invitationCode = InvitationEncoder.encode(invitation.invitation!);
        const acceptableInvitation = InvitationEncoder.decode(invitationCode);

        setInvitation(acceptableInvitation);

        return () => {
          void Promise.all(clients.map((client) => client.destroy()));
        };
      }, clients);

      if (!invitation) {
        return <Loading label='Setting things up…' />;
      }

      return (
        <ClientProvider client={clients[1]} fallback={() => <Loading label='Loading client…' />}>
          <Story args={{ initialInvitation: invitation }} />
        </ClientProvider>
      );
    }
  ]
};
