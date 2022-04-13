//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Party, InvitationDescriptor } from '@dxos/client';
import { ClientProvider, ProfileInitializer, useClient } from '@dxos/react-client';
import { PartyBuilder, buildTestParty, useTestParty } from '@dxos/react-client-testing';
import { useFileDownload } from '@dxos/react-components';
import { usePartySerializer } from '@dxos/react-framework';

import { ONLINE_CONFIG, App, InvitationDialog } from './helpers';

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
  };

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
    const [party, setParty] = useState<Party | null>();

    const partySerializer = usePartySerializer();
    const download = useFileDownload();

    const handleCreateParty = async () => {
      const party = await client.echo.createParty();
      const builder = new PartyBuilder(party);
      await buildTestParty(builder); // TODO(burdon): Rename.
      setParty(party);
    };

    const handleJoinParty = async (invitationText: string) => {
      const { encodedInvitation, secret } = JSON.parse(invitationText);
      const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(encodedInvitation));
      invitation.authenticate(Buffer.from(secret));
      const party = await invitation.getParty();
      setParty(party);
    };

    const handleExportParty = async () => {
      const blob = await partySerializer.serializeParty(party!);
      download(blob, `${party?.key.toHex()}.party`);
    };

    const handleImportParty = async (partyFile: File) => {
      const party = await partySerializer.deserializeParty(partyFile);
      setParty(party);
    };

    const handleInviteParty = async () => {
      const invitation = await party!.createInvitation();
      const encodedInvitation = invitation.descriptor.encode();
      const text = JSON.stringify({ encodedInvitation, secret: invitation.secret.toString() });
      await navigator.clipboard.writeText(text);

      console.log(text); // Required for playwright tests.
    };

    if (party) {
      return (
        <App
          party={party}
          onInvite={handleInviteParty}
          onExport={handleExportParty}
        />
      );
    }

    return (
      <InvitationDialog
        open
        onCreate={handleCreateParty}
        onJoin={handleJoinParty}
        onImport={handleImportParty}
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
