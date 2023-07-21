//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { StoryContext, StoryFn } from '@storybook/react';
import React, { useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { Loading } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { Client, ClientProvider } from '@dxos/react-client';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { TestBuilder } from '@dxos/react-client/testing';

import { JoinDialog } from './JoinDialog';

export default {
  component: JoinDialog,
};

const JoinClientDecorator = (Story: StoryFn, { args }: StoryContext) => {
  const n = 2;
  const testBuilder = new TestBuilder();
  const clients = useMemo(() => {
    return [...Array(n)].map(() => new Client({ services: testBuilder.createLocal() }));
  }, []);

  const [invitationCode, setInvitationCode] = useState<string>();

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    if (!invitationCode) {
      const nextInvitationCode = InvitationEncoder.encode(invitation);
      log.info('[next invitation code]', { nextInvitationCode });
      setInvitationCode(nextInvitationCode);
    }
    if (invitation.authCode) {
      log.info('[verification code]', invitation.authCode);
    }
  }, []);

  useAsyncEffect(async () => {
    await Promise.all(clients.map((client) => client.initialize()));
    log.info('[initialized]');

    await clients[0].halo.createIdentity({ displayName: 'Os Mutantes' });

    const space = await clients[0].createSpace();
    log.info('[space created]', space);
    space.properties.name = 'Q3 2022 Planning';

    const invitation = space.createInvitation({ type: Invitation.Type.INTERACTIVE });
    invitation.subscribe(onInvitationEvent, (err) => log.catch(err));

    return () => {
      void Promise.all(clients.map((client) => client.destroy()));
    };
  }, clients);

  if (!invitationCode) {
    return <Loading label='Setting things up…' />;
  }

  return (
    <ClientProvider client={clients[1]} fallback={() => <Loading label='Loading client…' />}>
      <Story args={{ initialInvitationCode: invitationCode, ...args }} />
    </ClientProvider>
  );
};

export const Default = {
  decorators: [JoinClientDecorator],
};
