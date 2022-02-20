//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Party, InvitationDescriptor } from '@dxos/client';
import { ClientProvider, ProfileInitializer, useClient } from '@dxos/react-client';

import { InvitationDialog, PartyBuilder } from '../src';
import {
  ONLINE_CONFIG,
  buildTestParty,
  useTestParty,
  App
} from './helpers';

export default {
  title: 'KitchenSink/App'
};

/**
 * Single-player App story.
 */
export const Primary = () => {
  const Story = () => {
    const party = useTestParty();
    if (!party) {
      return null;
    }

    return (
      <App party={party} />
    );
  }

  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};

/**
 * Collaborative App story.
 */
export const Secondary = () => {
  const Story = () => {
    const client = useClient();
    const [party, setParty] = useState<Party>();

    const handleCreateParty = async () => {
      const party = await client.echo.createParty();
      const builder = new PartyBuilder(party);
      await buildTestParty(party, builder!);
      setParty(party);
    };

    const handleJoinParty = async (invitationText: string) => {
      const { encodedInvitation, secret } = JSON.parse(invitationText);
      const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(encodedInvitation));
      invitation.authenticate(Buffer.from(secret));
      const party = await invitation.getParty();
      setParty(party);
    };

    if (party) {
      return (
        <App
          party={party}
          onInvite={async () => {
            const invitation = await party.createInvitation();
            const encodedInvitation = invitation.descriptor.encode();

            // TODO(burdon): Downside here is no way to prevent sender from being lazy (sending secret together).
            const text = JSON.stringify({ encodedInvitation, secret: invitation.secret.toString() });
            await navigator.clipboard.writeText(text);
            // Console log is required for E2E tests.
            console.log(text);
          }}
        />
      );
    }

    return (
      <InvitationDialog
        open
        onCreate={handleCreateParty}
        onJoin={handleJoinParty}
      />
    );
  };

  return (
    <ClientProvider config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
