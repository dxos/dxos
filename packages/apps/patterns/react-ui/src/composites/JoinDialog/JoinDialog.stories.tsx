//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { StoryFn } from '@storybook/react';
import React, { useCallback, useMemo, useState } from 'react';

import { Client, Invitation, InvitationEncoder } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

import { JoinDialog } from './JoinDialog';

export default {
  component: JoinDialog
};
export const Default = {
  decorators: [
    (Story: StoryFn) => {
      const n = 2;
      const testBuilder = new TestBuilder();
      const clients = useMemo(() => {
        return [...Array(n)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
      }, []);

      const [invitationCode, setInvitationCode] = useState<string>();

      const onInvitationEvent = useCallback((invitation: Invitation) => {
        if (!invitationCode) {
          const nextInvitationCode = InvitationEncoder.encode(invitation);
          log.info('[next invitation code]', { nextInvitationCode });
          setInvitationCode(nextInvitationCode);
        }
      }, []);

      useAsyncEffect(async () => {
        await Promise.all(clients.map((client) => client.initialize()));
        log.info('[initialized]');

        await clients[0].halo.createProfile({ displayName: 'Os Mutantes' });

        const space = await clients[0].echo.createSpace();
        log.info('[space created]', space);
        await space?.setProperty('title', 'Q3 2022 Planning');
        log.info('[space title set]', space?.getProperty('title'));

        const invitation = space.createInvitation({ type: Invitation.Type.INTERACTIVE });
        log.info('[invitation created]', invitation);

        invitation.subscribe({
          onAuthenticating: onInvitationEvent,
          onCancelled: (...args) => log.warn('[cancelled]', args),
          onConnected: onInvitationEvent,
          onConnecting: onInvitationEvent,
          onError: onInvitationEvent,
          onSuccess: onInvitationEvent,
          onTimeout: (...args) => log.warn('[timeout]', args)
        });

        return () => {
          void Promise.all(clients.map((client) => client.destroy()));
        };
      }, clients);

      if (!invitationCode) {
        return <Loading label='Setting things up…' />;
      }

      return (
        <ClientProvider client={clients[1]} fallback={() => <Loading label='Loading client…' />}>
          <Story args={{ initialInvitationCode: invitationCode }} />
        </ClientProvider>
      );
    }
  ]
};
